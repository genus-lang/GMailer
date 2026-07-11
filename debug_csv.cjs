const fs = require('fs');
const readline = require('readline');
const transcriptPath = 'C:\\Users\\rinku\\.gemini\\antigravity-ide\\brain\\3c686f58-098a-49f2-a37e-49d6ff27a462\\.system_generated\\logs\\transcript_full.jsonl';

async function run() {
  const fileStream = fs.createReadStream(transcriptPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    try {
      const data = JSON.parse(line);
      if (data.type === 'USER_INPUT' && data.content && data.content.includes('==Start of PDF==')) {
        console.log("FOUND MESSAGE!");
        console.log("Length:", data.content.length);
        console.log("Snippet:", data.content.substring(0, 1000));
        process.exit(0);
      }
    } catch(e) {}
  }
}
run();
