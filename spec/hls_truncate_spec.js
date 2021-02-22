const HLSTruncateVod = require('../index.js');
const fs = require('fs');
const Readable = require('stream').Readable;

const calcDuration = (manifest) => {
  const chunks = manifest.match(/#EXTINF:([0-9\.]+),*/g).map(m => parseFloat(m.split(':')[1]));
  return chunks.reduce((acc, curr) => acc + curr);
};

describe("HLSTruncateVod", () => {
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
  });