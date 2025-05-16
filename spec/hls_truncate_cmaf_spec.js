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
    let mockMasterManifest3;
    let mockMediaManifest3;
    let mockAudioManifest3;

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

      mockMasterManifest3 = () => {
        return fs.createReadStream('testvectors/cmaf/hls_2_demux_diff_len/master.m3u8')
      };    
      mockMediaManifest3 = (bw) => {
        const bwmap = {
          3500000: "3500000"
        }
        return fs.createReadStream(`testvectors/cmaf/hls_2_demux_diff_len/test-video=${bwmap[bw]}.m3u8`);
      };
      mockAudioManifest3 = () => {
        return fs.createReadStream(`testvectors/cmaf/hls_2_demux_diff_len/test-audio=256000.m3u8`);
      };  
      
    });

    it("cuts to the closest segment when requesting unaligned duration with equal time between them and has start offset, CASE 2", done => {
      const mockVod = new HLSTruncateVod('http://mock.com/mock.m3u8', 60, { offset: 18 });
      mockMasterManifest3 = () => {
        return fs.createReadStream('testvectors/cmaf/hls_2_demux_diff_len/master.m3u8')
      };
      mockMediaManifest3 = (bw) => {
        const bwmap = {
          3500000: "3500000"
        }
        return fs.createReadStream(`testvectors/cmaf/hls_2_demux_diff_len/test-video=${bwmap[bw]}.m3u8`);
      };
      mockAudioManifest3 = () => {
        return fs.createReadStream(`testvectors/cmaf/hls_2_demux_diff_len/test-audio=256000.m3u8`);
      };
      mockVod.load(mockMasterManifest3, mockMediaManifest3, mockAudioManifest3)
        .then(() => {
          const bandwidths = mockVod.getBandwidths();
          const videoManifest = mockVod.getMediaManifest(bandwidths[0]);
          const audioManifest = mockVod.getAudioManifest("audio-aacl-256", "sv");
          const linesVideo = videoManifest.split("\n");
          const linesAudio = audioManifest.split("\n");
          const durationVideo = calcDuration(videoManifest);
          const durationAudio = calcDuration(audioManifest);
          expect(durationVideo).toEqual(57.599999999999994);
          expect(durationAudio).toEqual(59.99199999999999);
          expect(linesVideo[5]).toEqual("video-1/3.ts");
          expect(linesAudio[5]).toEqual("audio/3.aac");
          done();
        })
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

      mockVod.load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
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

    it("cuts to the closest segment when requesting unaligned duration with equal time between them and has start offset, CASE 1", done => {
      const mockVod = new HLSTruncateVod('http://mock.com/mock.m3u8', 7.5, { offset: 5 });

      mockVod.load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
        .then(() => {
          const bandwidths = mockVod.getBandwidths();
          const videoManifest = mockVod.getMediaManifest(bandwidths[0]);
          const audioManifest = mockVod.getAudioManifest("audio-aacl-256", "sv");
          const linesVideo = videoManifest.split("\n");
          const linesAudio = audioManifest.split("\n");
          const durationVideo = calcDuration(videoManifest);
          const durationAudio = calcDuration(audioManifest);
          expect(durationVideo).toEqual(6);
          expect(durationAudio).toEqual(7.68);
          expect(linesVideo[9]).toEqual("test-video=2500000-2.m4s");
          expect(linesAudio[9]).toEqual("test-audio=256000-2.m4s");
          done();
        })
    });
  });
  describe("for Demuxed CMAF HLS Vods with subtitles,", () => {
    let mockMasterManifest;
    let mockMediaManifest;
    let mockAudioManifest;
    let mockSubtitleManifest;
    let mock_m3u8_1_demux_diff_len_subs;
    let mock_m3u8_3_demux_diff_len_subs;

    beforeEach(() => {
      mockMasterManifest = () => {
        return fs.createReadStream('testvectors/cmaf/hls_1_demux_subs/master_subs.m3u8')
      };
      mockMediaManifest = (bw) => {
        return fs.createReadStream(`testvectors/cmaf/hls_1_demux_subs/test-video=${bw}.m3u8`);
      };
      mockAudioManifest = () => {
        return fs.createReadStream(`testvectors/cmaf/hls_1_demux_subs/test-audio=256000.m3u8`);
      };
      mockSubtitleManifest = (groupId, lang) => {
        return fs.createReadStream(`testvectors/cmaf/hls_1_demux_subs/test-subs.m3u8`);
      };
      mock_m3u8_1_demux_diff_len_subs = {
        master: () => {
          return fs.createReadStream('testvectors/cmaf/hls_2_demux_diff_len_subs/master.m3u8')
        },
        media: () => {
          return fs.createReadStream(`testvectors/cmaf/hls_2_demux_diff_len_subs/video-1.m3u8`)
        },
        audio: () => {
          return fs.createReadStream(`testvectors/cmaf/hls_2_demux_diff_len_subs/audio.m3u8`)
        },
        subtitle: () => {
          return fs.createReadStream(`testvectors/cmaf/hls_2_demux_diff_len_subs/text-sv.m3u8`)
        }
      }
      mock_m3u8_3_demux_diff_len_subs = {
        master: () => {
          return fs.createReadStream('testvectors/cmaf/hls_3_demux_diff_len_subs/master.m3u8')
        },
        media: () => {
          return fs.createReadStream(`testvectors/cmaf/hls_3_demux_diff_len_subs/video-1.m3u8`)
        },
        audio: () => {
          return fs.createReadStream(`testvectors/cmaf/hls_3_demux_diff_len_subs/audio.m3u8`)
        },
        subtitle: () => {
          return fs.createReadStream(`testvectors/cmaf/hls_3_demux_diff_len_subs/text-sv.m3u8`)
        }
      }
    });

    it("can create a 6 second long HLS with subtitles by truncating a longer HLS", done => {
      const mockVod = new HLSTruncateVod('http://mock.com/mock.m3u8', 6, {});

      mockVod.load(mockMasterManifest, mockMediaManifest, mockAudioManifest, mockSubtitleManifest)
        .then(() => {
          const videoManifest = mockVod.getMediaManifest(2500000);
          const audioManifest = mockVod.getAudioManifest("audio-aacl-256", "sv");
          const subtitleManifest = mockVod.getSubtitleManifest("teststream", "sv");
          
          const durationVideo = calcDuration(videoManifest);
          const durationAudio = calcDuration(audioManifest);
          const durationSubtitle = calcDuration(subtitleManifest);
          
          expect(durationVideo).toEqual(6);
          expect(durationAudio).toEqual(6);
          expect(durationSubtitle).toEqual(6);
          done();
        });
    });

    it("creates a truncated HLS with subtitles when requesting longer than available duration", done => {
      const mockVod = new HLSTruncateVod('http://mock.com/mock.m3u8', 190, {});

      mockVod.load(mockMasterManifest, mockMediaManifest, mockAudioManifest, mockSubtitleManifest)
        .then(() => {
          const videoManifest = mockVod.getMediaManifest(2500000);
          const audioManifest = mockVod.getAudioManifest("audio-aacl-256", "sv");
          const subtitleManifest = mockVod.getSubtitleManifest("teststream", "sv");
          
          const durationVideo = calcDuration(videoManifest);
          const durationAudio = calcDuration(audioManifest);
          const durationSubtitle = calcDuration(subtitleManifest);
          
          // The test-subs.m3u8 file has 59 segments of mostly 3 seconds each (last one is 2.16)
          // Total duration should be around 176.16 seconds
          expect(durationVideo).toEqual(176.16);
          expect(durationSubtitle).toEqual(176.16);
          done();
        });
    });

    it("cuts subtitles to the closest segment when requesting unaligned duration, CASE 1", done => {
      const mockVod1 = new HLSTruncateVod('http://mock.com/mock.m3u8', 4, {});
      const mockVod2 = new HLSTruncateVod('http://mock.com/mock.m3u8', 5, {});

      mockVod1.load(mockMasterManifest, mockMediaManifest, mockAudioManifest, mockSubtitleManifest)
        .then(() => {
          const subtitleManifest = mockVod1.getSubtitleManifest("teststream", "sv");
          const duration = calcDuration(subtitleManifest);
          expect(duration).toEqual(3);
          return mockVod2.load(mockMasterManifest, mockMediaManifest, mockAudioManifest, mockSubtitleManifest);
        })
        .then(() => {
          const subtitleManifest = mockVod2.getSubtitleManifest("teststream", "sv");
          const duration = calcDuration(subtitleManifest);
          expect(duration).toEqual(6);
          done();
        });
    });

    it("cuts subtitles to the closest segment when requesting unaligned duration, CASE 2", done => {
      const mockVod1 = new HLSTruncateVod('http://mock.com/mock.m3u8', 17, { offset: 0 });
      const mockm3u8 = mock_m3u8_1_demux_diff_len_subs;

      mockVod1.load(mockm3u8.master, mockm3u8.media, mockm3u8.audio, mockm3u8.subtitle)
        .then(() => {
          const subtitleManifest = mockVod1.getSubtitleManifest("audio", "sv");
          const audioManifest = mockVod1.getAudioManifest("text", "sv");
          const videoManifest = mockVod1.getMediaManifest(mockVod1.getBandwidths()[0]);
          
          const durationVideo = calcDuration(videoManifest);
          const durationAudio = calcDuration(audioManifest);
          const durationSubtitle = calcDuration(subtitleManifest);

          const linesVideo = videoManifest.split("\n");
          const linesAudio = audioManifest.split("\n");
          const linesSubtitle = subtitleManifest.split("\n");

          // linesVideo.map((i,o) => console.log(i,o));
          // linesAudio.map((i,o) => console.log(i,o));
          // linesSubtitle.map((i,o) => console.log(i,o));

          expect(durationVideo).toEqual(20);
          expect(durationAudio).toEqual(24.064999999999998);
          expect(durationSubtitle).toEqual(18);

          expect(linesVideo[10]).toEqual("video-1/3.ts");
          expect(linesAudio[12]).toEqual("audio/4.aac");
          expect(linesSubtitle[10]).toEqual("text-sv/3.vtt");

          done();
        })
    });

    it("cuts subtitles to the closest segment when requesting unaligned duration, CASE 3", done => {
      const mockVod1 = new HLSTruncateVod('http://mock.com/mock.m3u8', 4, { offset: 0 });
      const mockm3u8 = mock_m3u8_3_demux_diff_len_subs;

      mockVod1.load(mockm3u8.master, mockm3u8.media, mockm3u8.audio, mockm3u8.subtitle)
        .then(() => {
          const subtitleManifest = mockVod1.getSubtitleManifest("audio", "sv");
          const audioManifest = mockVod1.getAudioManifest("text", "sv");
          const videoManifest = mockVod1.getMediaManifest(mockVod1.getBandwidths()[0]);
          
          const durationVideo = calcDuration(videoManifest);
          const durationAudio = calcDuration(audioManifest);
          const durationSubtitle = calcDuration(subtitleManifest);

          const linesVideo = videoManifest.split("\n");
          const linesAudio = audioManifest.split("\n");
          const linesSubtitle = subtitleManifest.split("\n");

          expect(durationVideo).toEqual(7.68);
          expect(durationAudio).toEqual(12.054);
          expect(durationSubtitle).toEqual(6);

          expect(linesVideo[6]).toEqual("video-1/1.ts");
          expect(linesAudio[8]).toEqual("audio/2.aac");
          expect(linesSubtitle[6]).toEqual("text-sv/1.vtt");

          done();
        })
    });

    it("can trim the beginning of subtitles if start offset is requested", done => {
      const mockVod = new HLSTruncateVod('http://mock.com/mock.m3u8', 9, { offset: 6 });

      mockVod.load(mockMasterManifest, mockMediaManifest, mockAudioManifest, mockSubtitleManifest)
        .then(() => {
          const subtitleManifest = mockVod.getSubtitleManifest("teststream", "sv");
          const lines = subtitleManifest.split("\n");
          
          // Should start from segment 3 (after skipping 6 seconds)
          expect(lines[9]).toEqual("test-subs-3.vtt");
          expect(lines[11]).toEqual("test-subs-4.vtt");
          
          const duration = calcDuration(subtitleManifest);
          expect(duration).toEqual(9);
          done();
        });
    });

    it("provides methods to get subtitle groups and languages", done => {
      const mockVod = new HLSTruncateVod('http://mock.com/mock.m3u8', 6, {});

      mockVod.load(mockMasterManifest, mockMediaManifest, mockAudioManifest, mockSubtitleManifest)
        .then(() => {

          const subtitleGroups = mockVod.getSubtitleGroupIds();
          
          expect(subtitleGroups).toContain("teststream");
          
          const subtitleLanguages = mockVod.getSubtitleLanguagesForGroupId("teststream");
          
          expect(subtitleLanguages).toContain("sv");
          
          done();
        })
        .catch(err => {
          console.error("Test failed:", err);
          done.fail(err);
        });
    });

    it("cuts subtitles to the closest segment when requesting unaligned duration with start offset with subtitles", done => {
      const mockVod = new HLSTruncateVod('http://mock.com/mock.m3u8', 12, { offset: 9 });

      mockVod.load(mockMasterManifest, mockMediaManifest, mockAudioManifest, mockSubtitleManifest)
        .then(() => {
          const videoManifest = mockVod.getMediaManifest(2500000);
          const audioManifest = mockVod.getAudioManifest("audio-aacl-256", "sv");
          const subtitleManifest = mockVod.getSubtitleManifest("teststream", "sv");
          
          const linesVideo = videoManifest.split("\n");
          const linesAudio = audioManifest.split("\n");
          const linesSubtitle = subtitleManifest.split("\n");
          
          const durationVideo = calcDuration(videoManifest);
          const durationAudio = calcDuration(audioManifest);
          const durationSubtitle = calcDuration(subtitleManifest);
          
          // Check durations
          expect(durationVideo).toEqual(12);
          expect(durationAudio).toEqual(12);
          expect(durationSubtitle).toEqual(12);
          
          // Check that we're starting from the correct segments (after offset)
          // For a 9-second offset with 3-second segments, we should start at segment 4
          expect(linesVideo[9]).toEqual("test-video=2500000-4.m4s");
          expect(linesAudio[9]).toEqual("test-audio=256000-4.m4s");
          expect(linesSubtitle[9]).toEqual("test-subs-4.vtt");
          
          done();
        })
        .catch(err => {
          console.error("Test failed:", err);
          done.fail(err);
        });
    });
  });
});