const HLSTruncateVod = require('../index.js');
const fs = require('fs');
const Readable = require('stream').Readable;

const calcDuration = (manifest) => {
  const chunks = manifest.match(/#EXTINF:([0-9\.]+),*/g).map(m => parseFloat(m.split(':')[1]));
  return chunks.reduce((acc, curr) => acc + curr);
};

describe("HLSTruncateVod for muxed TS HLS Vods", () => {
  let mockMasterManifest;
  let mockMediaManifest;

  beforeEach(() => {
    mockMasterManifest = () => {
      return fs.createReadStream('testvectors/hls1/master.m3u8')
    };
    mockMediaManifest = (bw) => {
      const bwmap = {
        4497000: "0",
        2497000: "1"
      }
      return fs.createReadStream(`testvectors/hls1/index_${bwmap[bw]}_av.m3u8`);
    };
    mockMasterManifest2 = () => {
      return fs.createReadStream('testvectors/hls_1_demux/master.m3u8')
    };
    mockMediaManifest2 = (bw) => {
      return fs.createReadStream(`testvectors/hls_1_demux/${bw}.m3u8`);
    };
    mockAudioManifest2 = (g, l) => {
      return fs.createReadStream(`testvectors/hls_1_demux/${g}-${l}.m3u8`);
    };
    mockMasterManifest3 = () => {
      return fs.createReadStream('testvectors/hls_1_demux_diff_len/master.m3u8')
    };
    mockMediaManifest3 = (bw) => {
      return fs.createReadStream(`testvectors/hls_1_demux_diff_len/test-video=${bw}.m3u8`);
    };
    mockAudioManifest3 = function (groupId, lang) {
      const bw = {
        "audio-aacl-128": "256000",
        "audio-aacl-256": "256000",
      };
      return fs.createReadStream("testvectors/hls_1_demux_diff_len/test-audio=" + bw[groupId] + ".m3u8");
    };
  });

  it("can create a 6 second long HLS by truncating a 120 sec HLS", done => {
    const mockVod = new HLSTruncateVod('http://mock.com/mock.m3u8', 6, {});

    mockVod.load(mockMasterManifest, mockMediaManifest)
      .then(() => {
        const bandwidths = mockVod.getBandwidths();
        const manifest = mockVod.getMediaManifest(bandwidths[0]);
        const duration = calcDuration(manifest);
        expect(duration).toEqual(6);
        done();
      });
  });

  it("creates a 30 second long HLS from a 30 second HLS when requesting 40 second duration", done => {
    const mockVod = new HLSTruncateVod('http://mock.com/mock.m3u8', 40, {});

    mockVod.load(mockMasterManifest, mockMediaManifest)
      .then(() => {
        const bandwidths = mockVod.getBandwidths();
        const manifest = mockVod.getMediaManifest(bandwidths[0]);
        const duration = calcDuration(manifest);
        expect(duration).toEqual(30);
        done();
      });
  });

  it("cuts to the closest segment when requesting unaligned duration", done => {
    const mockVod1 = new HLSTruncateVod('http://mock.com/mock.m3u8', 4, {});
    const mockVod2 = new HLSTruncateVod('http://mock.com/mock.m3u8', 5, {});

    mockVod1.load(mockMasterManifest, mockMediaManifest)
      .then(() => {
        const bandwidths = mockVod1.getBandwidths();
        const manifest = mockVod1.getMediaManifest(bandwidths[0]);
        const duration = calcDuration(manifest);
        expect(duration).toEqual(3);
        return mockVod2.load(mockMasterManifest, mockMediaManifest);
      })
      .then(() => {
        const bandwidths = mockVod2.getBandwidths();
        const manifest = mockVod2.getMediaManifest(bandwidths[0]);
        const duration = calcDuration(manifest);
        expect(duration).toEqual(6);
        done();
      })
  });

  it("cuts to the closest segment when requesting unaligned duration with equal time between them", done => {
    const mockVod1 = new HLSTruncateVod('http://mock.com/mock.m3u8', 7.5, {});

    mockVod1.load(mockMasterManifest, mockMediaManifest)
      .then(() => {
        const bandwidths = mockVod1.getBandwidths();
        const manifest = mockVod1.getMediaManifest(bandwidths[0]);
        const duration = calcDuration(manifest);
        expect(duration).toEqual(6);
        done();
      })
  });

  it("can trim the beginning if start offset is requested", done => {
    const mockVod = new HLSTruncateVod('http://mock.com/mock.m3u8', 6, { offset: 10 });

    mockVod.load(mockMasterManifest, mockMediaManifest)
      .then(() => {
        const bandwidths = mockVod.getBandwidths();
        const manifest = mockVod.getMediaManifest(bandwidths[0]);
        const lines = manifest.split("\n");
        expect(lines[8]).toEqual("segment5_0_av.ts");
        expect(lines[10]).toEqual("segment6_0_av.ts");
        const duration = calcDuration(manifest);
        expect(duration).toEqual(6);
        done();
      })
  });
});
describe("HLSTruncateVod,", () => {
  describe("for Demuxed TS HLS Vods", () => {
    let mockMasterManifest;
    let mockMediaManifest;
    let mockAudioManifest;

    beforeEach(() => {
      mockMasterManifest = () => {
        return fs.createReadStream('testvectors/hls_1_demux/master.m3u8')
      };
      mockMediaManifest = (bw) => {
        return fs.createReadStream(`testvectors/hls_1_demux/${bw}.m3u8`);
      };
      mockAudioManifest = (g, l) => {
        return fs.createReadStream(`testvectors/hls_1_demux/aac-en.m3u8`);
      };
    });

    it("can create a 20 second long HLS by truncating a 135 sec HLS", done => {
      const mockVod = new HLSTruncateVod('http://mock.com/mock.m3u8', 20, {});

      mockVod.load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
        .then(() => {
          const manifest = mockVod.getAudioManifest("aac", "en");
          const duration = calcDuration(manifest);
          expect(duration).toEqual(18.018);
          done();
        });
    });

    it("creates a 126.126 second long HLS from a 126.126 second HLS when requesting 130 second duration", done => {
      const mockVod = new HLSTruncateVod('http://mock.com/mock.m3u8', 130, {});

      mockVod.load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
        .then(() => {
          const manifest = mockVod.getAudioManifest("aac", "en");
          const duration = calcDuration(manifest);
          expect(duration).toEqual(126.126);
          done();
        });
    });

    it("cuts to the closest segment when requesting unaligned duration", done => {
      const mockVod1 = new HLSTruncateVod('http://mock.com/mock.m3u8', 4, {});
      const mockVod2 = new HLSTruncateVod('http://mock.com/mock.m3u8', 11, {});

      mockVod1.load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
        .then(() => {
          const audioManifest = mockVod1.getAudioManifest("aac", "en");
          const duration = calcDuration(audioManifest);
          expect(duration).toEqual(6.006);
          return mockVod2.load(mockMasterManifest, mockMediaManifest, mockAudioManifest);
        })
        .then(() => {
          const audioManifest = mockVod2.getAudioManifest("aac", "en");
          const duration = calcDuration(audioManifest);
          expect(duration).toEqual(12.012);
          done();
        })
    });

    it("cuts to the closest segment when requesting unaligned duration with equal time between them", done => {
      const mockVod1 = new HLSTruncateVod('http://mock.com/mock.m3u8', 6.006 * 1.5, {});

      mockVod1.load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
        .then(() => {
          const manifest = mockVod1.getAudioManifest("aac", "en");
          const duration = calcDuration(manifest);
          expect(duration).toEqual(6.006);
          done();
        })
    });
  });
  describe("for Demuxed TS HLS Vods which have different segments durations,", () => {
    let mockMasterManifest;
    let mockMediaManifest;
    let mockAudioManifest;

    beforeEach(() => {
      mockMasterManifest = () => {
        return fs.createReadStream('testvectors/hls_1_demux_diff_len/master.m3u8')
      };
      mockMediaManifest = (bw) => {
        return fs.createReadStream(`testvectors/hls_1_demux_diff_len/test-video=${bw}.m3u8`);
      };
      mockAudioManifest = function () {
        return fs.createReadStream("testvectors/hls_1_demux_diff_len/test-audio=256000.m3u8");
      };
    });

    it("can create a 20 second long HLS by truncating a 135 sec HLS", done => {
      const mockVod = new HLSTruncateVod('http://mock.com/mock.m3u8', 20, {});

      mockVod.load(mockMasterManifest, mockMediaManifest, mockAudioManifest)//1.92
        .then(() => {
          const videoManifest = mockVod.getMediaManifest(2500000);
          const audioManifest = mockVod.getAudioManifest("audio-aacl-256", "Swedish");
          const durationVideo = calcDuration(videoManifest);
          const durationAudio = calcDuration(audioManifest);
          expect(durationVideo).toEqual(21);
          expect(durationAudio).toEqual(21.120000000000005); 
          done();
        });
    });

    it("creates a 176 second long HLS from a 176 second HLS when requesting 200 second duration", done => {
      const mockVod = new HLSTruncateVod('http://mock.com/mock.m3u8', 200, {});

      mockVod.load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
        .then(() => {
          const bandwidths = mockVod.getBandwidths();
          const videoManifest = mockVod.getMediaManifest(bandwidths[0]);
          const audioManifest = mockVod.getAudioManifest("audio-aacl-256", "Swedish");
          const durationVideo = calcDuration(videoManifest);
          const durationAudio = calcDuration(audioManifest);
          expect(durationVideo).toEqual(176.16);
          expect(durationAudio).toEqual(176.2132999999998);
          done();
        });
    });

    it("cuts to the closest segment when requesting unaligned duration", done => {
      const mockVod = new HLSTruncateVod('http://mock.com/mock.m3u8', 4, {});
      const mockVod2 = new HLSTruncateVod('http://mock.com/mock.m3u8', 11, {});

      mockVod.load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
        .then(() => {
          const bandwidths = mockVod.getBandwidths();
          const videoManifest = mockVod.getMediaManifest(bandwidths[0]);
          const audioManifest = mockVod.getAudioManifest("audio-aacl-256", "Swedish");
          const durationVideo = calcDuration(videoManifest);
          const durationAudio = calcDuration(audioManifest);
          expect(durationVideo).toEqual(3);
          expect(durationAudio).toEqual(3.84);
          return mockVod2.load(mockMasterManifest, mockMediaManifest, mockAudioManifest);
        })
        .then(() => {
          const bandwidths = mockVod2.getBandwidths();
          const videoManifest = mockVod2.getMediaManifest(bandwidths[0]);
          const audioManifest = mockVod2.getAudioManifest("audio-aacl-256", "Swedish");
          const durationVideo = calcDuration(videoManifest);
          const durationAudio = calcDuration(audioManifest);
          expect(durationVideo).toEqual(12);
          expect(durationAudio).toEqual(13.44);
          done();
        })
    });

    it("cuts to the closest segment when requesting unaligned duration with equal time between them", done => {
      const mockVod = new HLSTruncateVod('http://mock.com/mock.m3u8', 6.006 * 1.5, {});

      mockVod.load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
        .then(() => {
          const bandwidths = mockVod.getBandwidths();
          const videoManifest = mockVod.getMediaManifest(bandwidths[0]);
          const audioManifest = mockVod.getAudioManifest("audio-aacl-256", "Swedish");
          const durationVideo = calcDuration(videoManifest);
          const durationAudio = calcDuration(audioManifest);
          expect(durationVideo).toEqual(9);
          expect(durationAudio).toEqual(9.6);
          done();
        })
    });
  });
});