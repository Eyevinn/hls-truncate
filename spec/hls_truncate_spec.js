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
        expect(lines[8]).toEqual("segment4_0_av.ts");
        expect(lines[10]).toEqual("segment5_0_av.ts");
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

    it("can trim the beginning if start offset is requested", done => {
      const mockVod = new HLSTruncateVod('http://mock.com/mock.m3u8', 30, { offset: 30 });
  
      mockVod.load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
        .then(() => {
          const bandwidths = mockVod.getBandwidths();
          const manifest = mockVod.getMediaManifest(bandwidths[0]);
          const lines = manifest.split("\n");
          expect(lines[8]).toEqual("level1/seg_36.ts");
          expect(lines[11]).toEqual("level1/seg_37.ts");
          const duration = calcDuration(manifest);
          expect(duration).toEqual(30.03);

          const audioManifest = mockVod.getAudioManifest("aac", "en");
          const audioLines = audioManifest.split("\n");
          expect(audioLines[8]).toEqual("audio/seg_en_36.ts");
          expect(audioLines[11]).toEqual("audio/seg_en_37.ts");
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
  describe("for Demuxed TS HLS Vods with subtitles,", () => {
    let mockMasterManifest;
    let mockMediaManifest;
    let mockAudioManifest;
    let mockSubtitleManifest;

    beforeEach(() => {
      mockMasterManifest = () => {
        return fs.createReadStream('testvectors/hls_1_demux_subs/master.m3u8')
      };
      mockMediaManifest = (bw) => {
        return fs.createReadStream(`testvectors/hls_1_demux_subs/8850073.m3u8`);
      };
      mockAudioManifest = (g, l) => {
        return fs.createReadStream(`testvectors/hls_1_demux_subs/aac-en.m3u8`);
      };
      mockSubtitleManifest = (groupId, lang) => {
        return fs.createReadStream(`testvectors/hls_1_demux_subs/subs-en.m3u8`);
      };
    });

    it("can create a 6 second long HLS with subtitles by truncating a longer HLS", done => {
      const mockVod = new HLSTruncateVod('http://mock.com/mock.m3u8', 6, {});

      mockVod.load(mockMasterManifest, mockMediaManifest, mockAudioManifest, mockSubtitleManifest)
        .then(() => {
          const bandwidths = mockVod.getBandwidths();
          const videoManifest = mockVod.getMediaManifest(bandwidths[0]);
          const audioManifest = mockVod.getAudioManifest("aac", "en");
          const subtitleManifest = mockVod.getSubtitleManifest("subs", "en");
          
          const durationVideo = calcDuration(videoManifest);
          const durationAudio = calcDuration(audioManifest);
          const durationSubtitle = calcDuration(subtitleManifest);
          
          expect(durationVideo).toEqual(6.006);
          expect(durationAudio).toEqual(6.006);
          expect(durationSubtitle).toEqual(6.006);
          done();
        });
    });

    it("creates a truncated HLS with subtitles when requesting longer than available duration", done => {
      const mockVod = new HLSTruncateVod('http://mock.com/mock.m3u8', 150, {});

      mockVod.load(mockMasterManifest, mockMediaManifest, mockAudioManifest, mockSubtitleManifest)
        .then(() => {
          const bandwidths = mockVod.getBandwidths();
          const videoManifest = mockVod.getMediaManifest(bandwidths[0]);
          const audioManifest = mockVod.getAudioManifest("aac", "en");
          const subtitleManifest = mockVod.getSubtitleManifest("subs", "en");
          
          const durationVideo = calcDuration(videoManifest);
          const durationAudio = calcDuration(audioManifest);
          const durationSubtitle = calcDuration(subtitleManifest);
          
          // The test files have 21 segments of 6.006 seconds each
          // Total duration should be around 126.126 seconds
          expect(durationVideo).toEqual(126.126);
          expect(durationAudio).toEqual(126.126);
          expect(durationSubtitle).toEqual(126.126);
          done();
        });
    });

    it("cuts subtitles to the closest segment when requesting unaligned duration", done => {
      const mockVod1 = new HLSTruncateVod('http://mock.com/mock.m3u8', 4, {});
      const mockVod2 = new HLSTruncateVod('http://mock.com/mock.m3u8', 8, {});

      mockVod1.load(mockMasterManifest, mockMediaManifest, mockAudioManifest, mockSubtitleManifest)
        .then(() => {
          const subtitleManifest = mockVod1.getSubtitleManifest("subs", "en");
          const duration = calcDuration(subtitleManifest);
          expect(duration).toEqual(6.006);
          return mockVod2.load(mockMasterManifest, mockMediaManifest, mockAudioManifest, mockSubtitleManifest);
        })
        .then(() => {
          const subtitleManifest = mockVod2.getSubtitleManifest("subs", "en");
          const duration = calcDuration(subtitleManifest);
          expect(duration).toEqual(6.006);
          done();
        });
    });

    it("can trim the beginning of subtitles if start offset is requested", done => {
      const mockVod = new HLSTruncateVod('http://mock.com/mock.m3u8', 12, { offset: 12 });

      mockVod.load(mockMasterManifest, mockMediaManifest, mockAudioManifest, mockSubtitleManifest)
        .then(() => {
          const subtitleManifest = mockVod.getSubtitleManifest("subs", "en");
          const lines = subtitleManifest.split("\n");
          
          // With 6.006 second segments and a 12 second offset, we should skip only 1 segment
          // So we should start from segment 33 (not 34)
          expect(lines[8]).toEqual("level1/seg_33.ts");
          
          const duration = calcDuration(subtitleManifest);
          expect(duration).toEqual(12.012);
          done();
        });
    });

    it("provides methods to get subtitle groups and languages", done => {
      const mockVod = new HLSTruncateVod('http://mock.com/mock.m3u8', 6, {});

      mockVod.load(mockMasterManifest, mockMediaManifest, mockAudioManifest, mockSubtitleManifest)
        .then(() => {
          const subtitleGroups = mockVod.getSubtitleGroupIds();
          expect(subtitleGroups).toContain("subs");
          
          const subtitleLanguages = mockVod.getSubtitleLanguagesForGroupId("subs");
          expect(subtitleLanguages).toContain("en");
          
          done();
        })
        .catch(err => {
          console.error("Test failed:", err);
          done.fail(err);
        });
    });

    it("cuts subtitles to the closest segment when requesting unaligned duration with start offset", done => {
      const mockVod = new HLSTruncateVod('http://mock.com/mock.m3u8', 18, { offset: 12 });

      mockVod.load(mockMasterManifest, mockMediaManifest, mockAudioManifest, mockSubtitleManifest)
        .then(() => {
          const bandwidths = mockVod.getBandwidths();
          const videoManifest = mockVod.getMediaManifest(bandwidths[0]);
          const audioManifest = mockVod.getAudioManifest("aac", "en");
          const subtitleManifest = mockVod.getSubtitleManifest("subs", "en");
          
          const linesVideo = videoManifest.split("\n");
          const linesAudio = audioManifest.split("\n");
          const linesSubtitle = subtitleManifest.split("\n");
          
          const durationVideo = calcDuration(videoManifest);
          const durationAudio = calcDuration(audioManifest);
          const durationSubtitle = calcDuration(subtitleManifest);
          
          // Check durations
          expect(durationVideo).toEqual(18.018);
          expect(durationAudio).toEqual(18.018);
          expect(durationSubtitle).toEqual(18.018);
          
          // Check that we're starting from the correct segments (after offset)
          // For a 12-second offset with 6.006-second segments, we should start at segment 33
          expect(linesVideo[8]).toEqual("level1/seg_33.ts");
          expect(linesAudio[8]).toEqual("audio/seg_en_33.ts");
          expect(linesSubtitle[8]).toEqual("level1/seg_33.ts");
          
          done();
        })
        .catch(err => {
          console.error("Test failed:", err);
          done.fail(err);
        });
    });
  });
});