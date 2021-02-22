const HLSTruncateVod = require('../index.js');
const fs = require('fs');
const Readable = require('stream').Readable;

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
      const mockVod = new HLSTruncateVod('http://mock.com/mock.m3u8', 30, {});
  
      // An example on how it can be initiated from a string instead of URL
      const masterManifest = fs.readFileSync('testvectors/hls1/master.m3u8', 'utf8');
      let masterManifestStream = new Readable();
      masterManifestStream.push(masterManifest);
      masterManifestStream.push(null);
  
      mockVod.load(() => { return masterManifestStream }, mockMediaManifest)
      .then(() => {
        const bandwidths = mockVod.getBandwidths();
        console.log(bandwidths);
        done();
      });
    });
  
    fit("can generate a truncated HLS from a downloaded HLS", done => {
      const hlsVod = new HLSTruncateVod('https://trailer-admin-cdn.b17g-stage.net/virtualchannels/filler/summer/index.m3u8', 5);
      hlsVod.load()
      .then(() => {
        const bandwidths = hlsVod.getBandwidths();
        bandwidths.map(bw => {
          const manifest = hlsVod.getMediaManifest(bw);
          expect(manifest).not.toBe('');
        });
        done();
      });
    });
  });