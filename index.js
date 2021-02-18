const m3u8 = require('@eyevinn/m3u8');

class HLSTruncateVod {
  constructor(vodManifestUri, duration, options) {

  }

  load(_injectMasterManifest, _injectMediaManifest) {
    return new Promise((resolve, reject) => {

    });
  }

  getBandwidths() {
    return this.bandwiths;
  }

  getMediaManifest(bw) {
    return this.playlists[bw].toString();
  }
}

module.exports = HLSTruncateVod;