const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const fetch = require('node-fetch');

const DOM_URL = 'https://api.github.com/repos/{repo_name}';

function getGitHubStars(repoName) {
  const url = DOM_URL.replace('{repo_name}', repoName);
  
  try {
    const response = fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (response.status !== 200) {
      console.error(`Failed to fetch data for ${repoName}: HTTP ${response.status}`);
      return null;
    }
    
    const data = response.json();
    return data.stargazers_count || 0;
    
  } catch (error) {
    console.error(`Error fetching data for ${repoName}: ${error.message}`);
    return null;
  }
}

function updateReadmeStars() {
  const readmePath = path.join(process.cwd(), 'README.md');
  
  const content = fs.readFileSync(readmePath, 'utf8');
  
  // Pattern to find repositories with star counts
  const pattern = /(\*\*([^*]+)\*\*\s+⭐\s+(\d+)\s*—)/g;
  
  let updatedContent = content;
  let updated = false;
  
  // Find all repo references in README
  const matches = Array.from(content.matchAll(pattern));
  
  for (const match of matches) {
    const [fullMatch, , repoName, currentCount] = match;
    
    // Skip if not a valid GitHub repo name
    if (!/^[a-zA-Z0-9_-]+$/.test(repoName)) {
      continue;
    }
    
    console.log(`Updating ${repoName}...`);
    
    // Get fresh star count from GitHub
    const newCount = getGitHubStars(repoName);
    
    if (newCount !== null && newCount !== parseInt(currentCount)) {
      // Replace the pattern with new count
      const newMatch = `**${repoName}** ⭐ ${newCount} —`;
      updatedContent = updatedContent.replace(fullMatch, newMatch);
      updated = true;
      console.log(`  Updated from ${currentCount} to ${newCount}`);
    } else {
      console.log(`  Already up to date (${currentCount})`);
    }
  }
  
  // If updates were made, write back to README
  if (updated) {
    fs.writeFileSync(readmePath, updatedContent, 'utf8');
    
    console.log('README.md updated successfully');
    
    // Try to commit the changes
    try {
      const { execSync } = require('child_process');
      
      execSync('git add README.md', { stdio: 'pipe' });
      
      const result = execSync('git commit -m "chore: update README star counts"', { 
        captureOutput: true, 
        encoding: 'utf8' 
      });
      
      if (result) {
        console.log('Changes committed successfully');
      } else {
        console.log('Failed to commit');
      }
      
      // Also push the changes
      execSync('git push', { stdio: 'pipe' });
      
    } catch (error) {
      console.error(`Failed to commit/push changes: ${error.message}`);
    }
  } else {
    console.log('No updates needed');
  }
}

function main() {
  console.log('Starting README star counts update...');
  updateReadmeStars();
  console.log('Done!');
}

if (require.main === module) {
  main();
}

module.exports = { updateReadmeStars };
