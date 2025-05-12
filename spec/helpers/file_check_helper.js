const fs = require('fs');

beforeAll(() => {
  console.log("Checking test vector files...");
  
  const requiredFiles = [
    // HLS 1 Demux files
    'testvectors/hls_1_demux/master.m3u8',
    'testvectors/hls_1_demux/aac-en.m3u8',
    'testvectors/hls_1_demux/8850073.m3u8',
    
    // HLS 1 files
    'testvectors/hls1/master.m3u8',
    'testvectors/hls1/index_0_av.m3u8',
    'testvectors/hls1/index_1_av.m3u8',
    
    // HLS 1 Demux Subs files
    'testvectors/hls_1_demux_subs/master.m3u8',
    'testvectors/hls_1_demux_subs/8850073.m3u8',
    'testvectors/hls_1_demux_subs/aac-en.m3u8',
    'testvectors/hls_1_demux_subs/subs-en.m3u8',
    
    // HLS 1 Demux Diff Len files
    'testvectors/hls_1_demux_diff_len/master.m3u8',
    'testvectors/hls_1_demux_diff_len/test-video=2500000.m3u8',
    'testvectors/hls_1_demux_diff_len/test-video=3500000.m3u8',
    'testvectors/hls_1_demux_diff_len/test-audio=256000.m3u8'
  ];
  
  const missingFiles = [];
  
  requiredFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      missingFiles.push(file);
      console.error(`❌ Missing test file: ${file}`);
    } else {
      // Check if file is readable and has content
      try {
        const stats = fs.statSync(file);
        if (stats.size === 0) {
          console.error(`⚠️ Test file is empty: ${file}`);
          missingFiles.push(`${file} (empty)`);
        } else {
          console.log(`✅ Found test file: ${file} (${stats.size} bytes)`);
        }
      } catch (error) {
        console.error(`❌ Error accessing test file: ${file}`, error);
        missingFiles.push(`${file} (access error)`);
      }
    }
  });
  
  if (missingFiles.length > 0) {
    throw new Error(`Missing or invalid test files: ${missingFiles.join(', ')}`);
  }
  
  console.log("All test vector files verified successfully.");
}); 