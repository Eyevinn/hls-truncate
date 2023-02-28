const HLSTruncateVod = require('../index.js');
const fs = require('fs');
const Readable = require('stream').Readable;

const calcDuration = (manifest) => {
  const chunks = manifest.match(/#EXTINF:([0-9\.]+),*/g).map(m => parseFloat(m.split(':')[1]));
  return chunks.reduce((acc, curr) => acc + curr);
};

describe("HLSTruncateVod", () => {
  describe("for Muxed CMAF HLS VOD,", () => {
    let mockMasterManifest;
    let mockMediaManifest;

    beforeEach(() => {
      mockMasterManifest = () => {
        return fs.createReadStream('testvectors/cmaf/hls_1/master.m3u8')
      };
      mockMediaManifest = (bw) => {
        const bwmap = {
          2500000: "2500000",
          3500000: "3500000"
        }
        return fs.createReadStream(`testvectors/cmaf/hls_1/test-video=${bwmap[bw]}.m3u8`);
      };
    });

    it("can create a 6 second long HLS by truncating a 30 sec HLS", done => {
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

    it("creates a 30 second long HLS from a 176.16 second HLS when requesting 190 second duration", done => {
      const mockVod = new HLSTruncateVod('http://mock.com/mock.m3u8', 190, {});

      mockVod.load(mockMasterManifest, mockMediaManifest)
        .then(() => {
          const bandwidths = mockVod.getBandwidths();
          const manifest = mockVod.getMediaManifest(bandwidths[0]);
          const duration = calcDuration(manifest);
          expect(duration).toEqual(176.16);
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
  });
  describe("for Demuxed CMAF HLS Vods,", () => {
    let mockMasterManifest;
    let mockMediaManifest;
    let mockAudioManifest;

    beforeEach(() => {
      mockMasterManifest = () => {
        return fs.createReadStream('testvectors/cmaf/hls_1_demux/master.m3u8')
      };
      mockMediaManifest = (bw) => {
        const bwmap = {
          2500000: "2500000",
          3500000: "3500000"
        }
        return fs.createReadStream(`testvectors/cmaf/hls_1_demux/test-video=${bwmap[bw]}.m3u8`);
      };
      mockAudioManifest = () => {
        return fs.createReadStream(`testvectors/cmaf/hls_1_demux/test-audio=256000.m3u8`);
      };
      
    });

    it("can create a 6 second long HLS by truncating a 176 sec HLS", done => {
      const mockVod = new HLSTruncateVod('http://mock.com/mock.m3u8', 6, {});

      mockVod.load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
        .then(() => {
          const manifest = mockVod.getAudioManifest("audio-aacl-256", "Swedish");
          const duration = calcDuration(manifest);
          expect(duration).toEqual(6);
          done();
        });
    });

    it("creates a 30 second long HLS from a 176.16 second HLS when requesting 190 second duration", done => {
      const mockVod = new HLSTruncateVod('http://mock.com/mock.m3u8', 190, {});

      mockVod.load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
        .then(() => {
          const manifest = mockVod.getAudioManifest("audio-aacl-256", "sv");
          const duration = calcDuration(manifest);
          expect(duration).toEqual(176.16);
          done();
        });
    });

    it("cuts to the closest segment when requesting unaligned duration", done => {
      const mockVod1 = new HLSTruncateVod('http://mock.com/mock.m3u8', 4, {});
      const mockVod2 = new HLSTruncateVod('http://mock.com/mock.m3u8', 5, {});

      mockVod1.load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
        .then(() => {
          const manifest = mockVod1.getAudioManifest("audio-aacl-256", "sv");
          const duration = calcDuration(manifest);
          expect(duration).toEqual(3);
          return mockVod2.load(mockMasterManifest, mockMediaManifest, mockAudioManifest);
        })
        .then(() => {
          const manifest = mockVod2.getAudioManifest("audio-aacl-256", "sv");
          const duration = calcDuration(manifest);
          expect(duration).toEqual(6);
          done();
        })
    });

    it("cuts to the closest segment when requesting unaligned duration with equal time between them", done => {
      const mockVod1 = new HLSTruncateVod('http://mock.com/mock.m3u8', 7.5, {});

      mockVod1.load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
        .then(() => {
          const manifest = mockVod1.getAudioManifest("audio-aacl-256", "sv");
          const duration = calcDuration(manifest);
          expect(duration).toEqual(6);
          done();
        })
    });
  });
  describe("for Demuxed CMAF HLS Vods which have different segments durations,", () => {
    let mockMasterManifest;
    let mockMediaManifest;
    let mockAudioManifest;
    let mockMasterManifest2;
    let mockMediaManifest2;
    let mockAudioManifest2;

    beforeEach(() => {
      mockMasterManifest = () => {
        return fs.createReadStream('testvectors/cmaf/hls_1_demux_diff_len/master.m3u8')
      };
      mockMediaManifest = (bw) => {
        const bwmap = {
          2500000: "2500000",
          3500000: "3500000"
        }
        return fs.createReadStream(`testvectors/cmaf/hls_1_demux_diff_len/test-video=${bwmap[bw]}.m3u8`);
      };
      mockAudioManifest = () => {
        return fs.createReadStream(`testvectors/cmaf/hls_1_demux_diff_len/test-audio=256000.m3u8`);
      };

      mockMasterManifest2 = () => {
        return fs.createReadStream('testvectors/cmaf/hls_1_demux_diff_len_repeated/master.m3u8')
      };
      mockMediaManifest2 = (bw) => {
        const bwmap = {
          2500000: "2500000",
          3500000: "3500000"
        }
        return fs.createReadStream(`testvectors/cmaf/hls_1_demux_diff_len_repeated/test-video=${bwmap[bw]}.m3u8`);
      };
      mockAudioManifest2 = () => {
        return fs.createReadStream(`testvectors/cmaf/hls_1_demux_diff_len_repeated/test-audio=256000.m3u8`);
      };
    });

    it("can create a 6 second long HLS by truncating a 30 sec HLS", done => {
      const mockVod = new HLSTruncateVod('http://mock.com/mock.m3u8', 6, {});

      mockVod.load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
        .then(() => {
          const bandwidths = mockVod.getBandwidths();
          const videoManifest = mockVod.getMediaManifest(bandwidths[0]);
          const audioManifest = mockVod.getAudioManifest("audio-aacl-256", "sv")
          const durationVideo = calcDuration(videoManifest);
          const durationAudio = calcDuration(audioManifest);
          expect(durationVideo).toEqual(6);
          expect(durationAudio).toEqual(7.68);
          done();
        });
    });

    it("creates a 176.16 second long HLS from a 176.16 second HLS when requesting 190 second duration", done => {
      const mockVod = new HLSTruncateVod('http://mock.com/mock.m3u8', 190, {});

      mockVod.load(mockMasterManifest, mockMediaManifest,mockAudioManifest)
        .then(() => {
          const bandwidths = mockVod.getBandwidths();
          const videoManifest = mockVod.getMediaManifest(bandwidths[0]);
          const audioManifest = mockVod.getAudioManifest("audio-aacl-256", "sv")
          const durationVideo = calcDuration(videoManifest);
          const durationAudio = calcDuration(audioManifest);
          expect(durationVideo).toEqual(176.16);
          expect(durationAudio).toEqual(176.2132999999998);
          done();
        });
    });

    it("cuts to the closest segment when requesting unaligned duration", done => {
      const mockVod = new HLSTruncateVod('http://mock.com/mock.m3u8', 4, {});
      const mockVod2 = new HLSTruncateVod('http://mock.com/mock.m3u8', 5, {});

      mockVod.load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
        .then(() => {
          const bandwidths = mockVod.getBandwidths();
          const videoManifest = mockVod.getMediaManifest(bandwidths[0]);
          const audioManifest = mockVod.getAudioManifest("audio-aacl-256", "sv")
          const durationVideo = calcDuration(videoManifest);
          const durationAudio = calcDuration(audioManifest);
          expect(durationVideo).toEqual(3);
          expect(durationAudio).toEqual(3.84);
          return mockVod2.load(mockMasterManifest, mockMediaManifest, mockAudioManifest);
        })
        .then(() => {
          const bandwidths = mockVod.getBandwidths();
          const videoManifest = mockVod.getMediaManifest(bandwidths[0]);
          const audioManifest = mockVod.getAudioManifest("audio-aacl-256", "sv")
          const durationVideo = calcDuration(videoManifest);
          const durationAudio = calcDuration(audioManifest);
          expect(durationVideo).toEqual(3);
          expect(durationAudio).toEqual(3.84);
          done();
        })
    });

    it("cuts to the closest segment when requesting unaligned duration on a repeated vod", done => {
      const mockVod = new HLSTruncateVod('http://mock.com/mock.m3u8', 33, {});

      mockVod.load(mockMasterManifest2, mockMediaManifest2, mockAudioManifest2)
        .then(() => {
          const bandwidths = mockVod.getBandwidths();
          const videoManifest = mockVod.getMediaManifest(bandwidths[0]);
          const audioManifest = mockVod.getAudioManifest("audio-aacl-256", "sv")
          const durationVideo = calcDuration(videoManifest);
          const durationAudio = calcDuration(audioManifest);
          expect(durationVideo).toEqual(33);
          expect(durationAudio).toEqual(34.56000000000002);
          done();
        })
    });

    it("cuts to the closest segment when requesting unaligned duration with equal time between them", done => {
      const mockVod = new HLSTruncateVod('http://mock.com/mock.m3u8', 7.5, {});

      mockVod.load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
        .then(() => {
          const bandwidths = mockVod.getBandwidths();
          const videoManifest = mockVod.getMediaManifest(bandwidths[0]);
          const audioManifest = mockVod.getAudioManifest("audio-aacl-256", "sv")
          const durationVideo = calcDuration(videoManifest);
          const durationAudio = calcDuration(audioManifest);
          expect(durationVideo).toEqual(6);
          expect(durationAudio).toEqual(7.68);
          done();
        })
    });
  });
});