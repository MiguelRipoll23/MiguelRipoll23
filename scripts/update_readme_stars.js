const fs = require('fs');
const path = require('path');
const https = require('https');

function getGitHubStars(repoName) {
  return new Promise((resolve, reject) => {
    const url = `https://api.github.com/repos/${repoName}`;

    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/vnd.github.v3+json' } }, (res) => {
      let data = '';

      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          console.error(`Failed to fetch data for ${repoName}: HTTP ${res.statusCode}`);
          resolve(null);
          return;
        }

        try {
          const parsed = JSON.parse(data);
          resolve(parsed.stargazers_count || 0);
        } catch (err) {
          console.error(`Error parsing response for ${repoName}: ${err.message}`);
          resolve(null);
        }
      });
    }).on('error', (err) => {
      console.error(`Error fetching data for ${repoName}: ${err.message}`);
      resolve(null);
    });
  });
}

async function updateReadmeStars() {
  const readmePath = path.join(process.cwd(), 'README.md');

  const content = fs.readFileSync(readmePath, 'utf8');

  const pattern = /(\*\*([^*]+)\*\*\s+⭐\s+(\d+)\s*—)/g;

  let updatedContent = content;
  let updated = false;

  const matches = Array.from(content.matchAll(pattern));

  for (const match of matches) {
    const [fullMatch, , repoName, currentCount] = match;

    if (!/^[a-zA-Z0-9_-]+$/.test(repoName)) {
      continue;
    }

    process.stdout.write(`Updating ${repoName}... `);

    const newCount = await getGitHubStars(repoName);

    if (newCount !== null && newCount !== parseInt(currentCount)) {
      const newMatch = `**${repoName}** ⭐ ${newCount} —`;
      updatedContent = updatedContent.replace(fullMatch, newMatch);
      updated = true;
      console.log(`✅ ${currentCount} → ${newCount}`);
    } else {
      console.log(`✓ (${currentCount})`);
    }
  }

  if (updated) {
    fs.writeFileSync(readmePath, updatedContent, 'utf8');
    console.log('README.md updated successfully');

    try {
      const { execSync } = require('child_process');

      execSync('git add README.md', { stdio: 'pipe' });
      execSync('git commit -m "chore: update README star counts"', { stdio: 'pipe' });
      execSync('git push', { stdio: 'pipe' });

      console.log('Changes committed and pushed successfully');
    } catch (error) {
      console.error(`Failed to commit/push changes: ${error.message}`);
    }
  } else {
    console.log('No updates needed');
  }
}

async function main() {
  console.log('Starting README star counts update...');
  await updateReadmeStars();
  console.log('Done!');
}

main();

module.exports = { updateReadmeStars };
