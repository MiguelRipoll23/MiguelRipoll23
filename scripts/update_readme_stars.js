import fs from 'fs';
import path from 'path';
import https from 'https';
import { execSync } from 'child_process';

function getGitHubStars(repoName) {
  return new Promise((resolve) => {
    const url = `https://api.github.com/repos/${repoName}`;

    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/vnd.github.v3+json' }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          console.error(`  Failed: HTTP ${res.statusCode}`);
          resolve(null);
          return;
        }
        try {
          resolve(JSON.parse(data).stargazers_count || 0);
        } catch (err) {
          console.error(`  Parse error: ${err.message}`);
          resolve(null);
        }
      });
    }).on('error', (err) => {
      console.error(`  Error: ${err.message}`);
      resolve(null);
    });
  });
}

async function updateReadmeStars() {
  const readmePath = path.join(process.cwd(), 'README.md');
  const content = fs.readFileSync(readmePath, 'utf8');

  // Matches both formats:
  //   [**name**](https://github.com/owner/name) ⭐ N —
  //   **name** ⭐ N —
  const pattern = /(?:\[)?\*\*([^*]+)\*\*\]?(?:\((?:https:\/\/github\.com\/[\w-]+\/([\w.-]+))?\))?\s+⭐\s+(\d+)\s*—/g;

  let updatedContent = content;
  let updated = false;
  const matches = Array.from(content.matchAll(pattern));

  for (const match of matches) {
    const [fullMatch, boldName, urlName, currentCount] = match;
    const repoName = urlName || boldName;

    if (!/^[\w.-]+$/.test(repoName)) continue;

    process.stdout.write(`Updating ${repoName}... `);
    const newCount = await getGitHubStars(`MiguelRipoll23/${repoName}`);

    if (newCount !== null && newCount !== Number(currentCount)) {
      updatedContent = updatedContent.replace(fullMatch, fullMatch.replace(/\d+(?=\s*—)/, String(newCount)));
      updated = true;
      console.log(`✅ ${currentCount} → ${newCount}`);
    } else if (newCount === null) {
      console.log(`⚠ skipped`);
    } else {
      console.log(`✓ (${currentCount})`);
    }
  }

  if (updated) {
    fs.writeFileSync(readmePath, updatedContent, 'utf8');
    console.log('\nREADME.md updated successfully');

    try {
      execSync('git add README.md', { stdio: 'pipe' });
      execSync('git commit -m "chore: update README star counts"', { stdio: 'pipe' });
      execSync('git push', { stdio: 'pipe' });
      console.log('Changes committed and pushed successfully');
    } catch (error) {
      console.error(`Failed to commit/push: ${error.message}`);
    }
  } else {
    console.log('No updates needed');
  }
}

console.log('Starting README star counts update...');
await updateReadmeStars();
console.log('Done!');
