#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

function runTest(enabled) {
    return new Promise((resolve) => {
        const testFile = path.join(__dirname, 'test-module-separation.html');
        const prefValue = enabled ? 'true' : 'false';

        console.log(`\n=== Testing with dom.script.separate-defer-module-tasks.enabled=${prefValue} ===`);

        const args = [
            'run',
            '--headless',  // Run in headless mode to avoid graphics issues
            `--setpref`, `dom.script.separate-defer-module-tasks.enabled=${prefValue}`,
            `file://${testFile}`
        ];

        const firefox = spawn('./mach', args, {
            cwd: __dirname,
            timeout: 10000
        });

        let output = '';

        firefox.stdout.on('data', (data) => {
            output += data.toString();
        });

        firefox.stderr.on('data', (data) => {
            const str = data.toString();
            // Filter out graphics errors
            if (!str.includes('RenderCompositor') && !str.includes('GraphicsCritical')) {
                output += str;
            }
        });

        setTimeout(() => {
            firefox.kill();
            console.log('Test completed');

            // Check if RAF executed between modules
            const rafExecuted = output.includes('RAF executed between modules: true');
            console.log(`Result: RAF executed between modules = ${rafExecuted}`);

            resolve(rafExecuted);
        }, 5000);
    });
}

async function main() {
    console.log('Testing Firefox Module Script Task Separation');
    console.log('==============================================');

    const disabledResult = await runTest(false);
    const enabledResult = await runTest(true);

    console.log('\n=== SUMMARY ===');
    console.log(`Feature DISABLED: RAF between modules = ${disabledResult}`);
    console.log(`Feature ENABLED:  RAF between modules = ${enabledResult}`);

    if (!disabledResult && enabledResult) {
        console.log('\n✅ SUCCESS! Feature is working correctly!');
        console.log('   - Disabled: Scripts run synchronously (no RAF)');
        console.log('   - Enabled:  Scripts run as separate tasks (RAF executes)');
    } else if (disabledResult === enabledResult) {
        console.log('\n❌ ISSUE: Same behavior regardless of feature flag');
        console.log(`   Both show RAF = ${disabledResult}`);
    } else {
        console.log('\n⚠️  UNEXPECTED: Opposite of expected behavior');
    }
}

main().catch(console.error);