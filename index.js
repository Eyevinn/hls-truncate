const m3u8 = require('@eyevinn/m3u8');
const fetch = require('node-fetch');
const url = require('url');

class HLSTruncateVod {
  constructor(vodManifestUri, duration, options) {
    this.masterManifestUri = vodManifestUri;
    this.playlists = {};
    this.duration = duration;
    this.bandwiths = [];
  }

  load(_injectMasterManifest, _injectMediaManifest) {
    return new Promise((resolve, reject) => {
      const parser = m3u8.createStream();

      parser.on('m3u', m3u => {
        this.m3u = m3u;
        let mediaManifestPromises = [];
        let baseUrl;
        const m = this.masterManifestUri.match(/^(.*)\/.*?$/);
        if (m) {
          baseUrl = m[1] + '/';
        }
        
        for (let i = 0; i < m3u.items.StreamItem.length; i++) {
          const streamItem = m3u.items.StreamItem[i];
          this.bandwiths.push(streamItem.get('bandwidth'));
          const mediaManifestUrl = url.resolve(baseUrl, streamItem.get('uri'));
          mediaManifestPromises.push(this._loadMediaManifest(mediaManifestUrl, streamItem.get('bandwidth'), _injectMediaManifest));
        }
          
        Promise.all(mediaManifestPromises)
        .then(resolve)
        .catch(reject);
      });
      parser.on('error', (err) => {
        reject("Failed to parse M3U8: " + err);
      });
      if (!_injectMasterManifest) {
        fetch(this.masterManifestUri)
        .then(res => {
          res.body.pipe(parser);
        })
        .catch(reject);
      } else {
        _injectMasterManifest().pipe(parser);
      }
    });  
  }

  getBandwidths() {
    return this.bandwiths;
  }

  getMediaManifest(bw) {
    return this.playlists[bw].toString();
  }

  _loadMediaManifest(mediaManifestUri, bandwidth, _injectMediaManifest) {
    return new Promise((resolve, reject) => {
      const parser = m3u8.createStream();

      parser.on('m3u', m3u => {
        if (!this.playlists[bandwidth]) {
          this.playlists[bandwidth] = m3u;
        }
        let accDuration = 0;
        let prevAccDuration = 0;
        let pos = 0;
        
        m3u.items.PlaylistItem.map((item => {
          if (accDuration <= this.duration) {
            prevAccDuration = accDuration;
            accDuration += item.get('duration');
            pos++;
          } 
        }));

        // Logic to find the nearest segment in time:
        // At this stage accDuration is greater than the target duration.
        // If not closer to the target than prevAccDuration, step back a segment.
        if((accDuration - this.duration) >= ( this.duration - prevAccDuration)) {
          pos--;
        }
        this.playlists[bandwidth].items.PlaylistItem = m3u.items.PlaylistItem.slice(0, pos);
        resolve();
      });
      parser.on('error', (err) => {
        reject("Failed to parse M3U8: " + err);
      });
      if (!_injectMediaManifest) {
        fetch(mediaManifestUri)
        .then(res => {
          res.body.pipe(parser);
        })
        .catch(reject);
      } else {
        _injectMediaManifest(bandwidth).pipe(parser);
      }
    });
  }
}

module.exports = HLSTruncateVod;