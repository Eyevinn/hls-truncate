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

        let playlistItems = this.playlists[bandwidth].items.PlaylistItem;
        let length = 0;
        // Truncate playlist items here
        // - copy items
        // - accumulate length of each playlist item
        // - compare to duration
        // - stop as soon as duration is less then cumulative value
        let i = 0;
        while(i < playlistItems.length && length < this.duration) {
          const itemDuration = playlistItems[i].properties.duration;
          length += itemDuration
          
          if(length < this.duration) {
            this.playlists[bandwidth].items.PlaylistItem = this.playlists[bandwidth].items.PlaylistItem.concat(playlistItems);
          }
          i++;
        }

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