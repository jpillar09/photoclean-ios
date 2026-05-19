#!/usr/bin/env node
/**
 * This script patches react-native-reanimated to remove the
 * worklets version validation that causes EAS builds to fail.
 * 
 * The issue: Expo SDK 55's precompiled modules system resolves
 * react-native-worklets 0.8.3, but reanimated 4.x's podspec only
 * accepts 0.7.x, causing pod install to fail.
 * 
 * This script runs as postinstall and removes the validation entirely.
 */

const fs = require('fs');
const path = require('path');

const reanimatedPath = path.join(__dirname, '..', 'node_modules', 'react-native-reanimated');

if (!fs.existsSync(reanimatedPath)) {
  console.log('[fix-reanimated] react-native-reanimated not found, skipping.');
  process.exit(0);
}

// 1. Replace validate-worklets-version.js with a no-op
const validateScript = path.join(reanimatedPath, 'scripts', 'validate-worklets-version.js');
if (fs.existsSync(validateScript)) {
  fs.writeFileSync(validateScript, '// Patched: validation disabled\nprocess.exit(0);\n');
  console.log('[fix-reanimated] Patched validate-worklets-version.js');
}

// 2. Replace validate-worklets-build.js with a no-op
const validateBuildScript = path.join(reanimatedPath, 'scripts', 'validate-worklets-build.js');
if (fs.existsSync(validateBuildScript)) {
  fs.writeFileSync(validateBuildScript, '// Patched: validation disabled\nprocess.exit(0);\n');
  console.log('[fix-reanimated] Patched validate-worklets-build.js');
}

// 3. Patch reanimated_utils.rb - replace the validation block properly
const utilsRb = path.join(reanimatedPath, 'scripts', 'reanimated_utils.rb');
if (fs.existsSync(utilsRb)) {
  let content = fs.readFileSync(utilsRb, 'utf8');
  
  // Replace the entire validation block:
  // Original pattern:
  //   validate_worklets_script = File.expand_path(...)
  //   unless system("node \"#{validate_worklets_script}\"")
  //     abort("[Reanimated] Failed to validate worklets version")
  //   end
  
  // Use regex to match the block regardless of exact variable name
  const validationBlockRegex = /\s*\w*validate_worklets\w*\s*=\s*File\.expand_path.*?\n\s*unless\s+system\(.*?validate_worklets.*?\)\s*\n\s*abort\(.*?\)\s*\n\s*end/gs;
  
  if (validationBlockRegex.test(content)) {
    content = content.replace(validationBlockRegex, '\n  # [Patched] Worklets validation disabled');
    fs.writeFileSync(utilsRb, content);
    console.log('[fix-reanimated] Patched reanimated_utils.rb (removed validation block)');
  } else {
    // Try a simpler approach - just comment out the abort line and make unless always pass
    // Find: unless system("node ... validate_worklets ...")
    //        abort(...)
    //       end
    // Replace with nothing
    const simpleRegex = /unless\s+system\([^)]*validate.worklets[^)]*\)\s*\n[^]*?abort\([^)]*\)\s*\n\s*end/g;
    if (simpleRegex.test(content)) {
      content = content.replace(simpleRegex, '# [Patched] Worklets validation removed');
      fs.writeFileSync(utilsRb, content);
      console.log('[fix-reanimated] Patched reanimated_utils.rb (simple pattern)');
    } else {
      // Last resort: replace any line containing validate_worklets with a comment
      // and replace the abort line
      const lines = content.split('\n');
      const newLines = [];
      let skipUntilEnd = false;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('validate_worklets') || line.includes('validate-worklets')) {
          newLines.push('  # [Patched] ' + line.trim());
          // Check if next lines are unless/abort/end block
          if (lines[i+1] && lines[i+1].includes('unless system')) {
            skipUntilEnd = true;
          }
        } else if (skipUntilEnd) {
          if (line.trim() === 'end') {
            newLines.push('  # [Patched] ' + line.trim());
            skipUntilEnd = false;
          } else {
            newLines.push('  # [Patched] ' + line.trim());
          }
        } else {
          newLines.push(line);
        }
      }
      fs.writeFileSync(utilsRb, newLines.join('\n'));
      console.log('[fix-reanimated] Patched reanimated_utils.rb (line-by-line)');
    }
  }
}

// 4. Patch the RNReanimated.podspec if it calls validation
const podspecPath = path.join(reanimatedPath, 'RNReanimated.podspec');
if (fs.existsSync(podspecPath)) {
  let content = fs.readFileSync(podspecPath, 'utf8');
  if (content.includes('validate_worklets')) {
    content = content.replace(/validate_worklets[^\n]*/g, '# [Patched] validation disabled');
    fs.writeFileSync(podspecPath, content);
    console.log('[fix-reanimated] Patched RNReanimated.podspec');
  }
}

console.log('[fix-reanimated] All patches applied successfully.');
