const fs = require('fs');
const path = require('path');

function readJSONSafe(file) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
        return null;
    };
};

async function main() {
    const webhookURL = process.env.WEBHOOK_URL;
    if (!webhookURL) {
        console.error('WEBHOOK_URL not provided');
        process.exit(1);
    };

    const repoRoot = process.env.GITHUB_WORKSPACE || process.cwd();
    const modJSONPath = process.env.MOD_JSON_PATH || path.join(repoRoot, 'mod.json');
    const modJSONFull = path.isAbsolute(modJSONPath) ? modJSONPath : path.join(repoRoot, modJSONPath);
    const mod = readJSONSafe(modJSONFull);
    if (!mod) {
        console.error('Failed to read mod.json at', modJSONFull);
        process.exit(1);
    };

    const changelogText = process.env.CHANGELOG_TEXT || '';

    // mod data
    const name = mod.name || mod.id || 'Unknown Mod';
    const id = mod.id || '';

    let version = mod.version || '1.0.0';
    if (version.toLowerCase().startsWith("v")) version = version.slice(1);

    let accessory = null;
    const repo = process.env.GITHUB_REPOSITORY || '';
    const ref = process.env.GITHUB_REF || '';

    let logoUrl = ref ? `https://raw.githubusercontent.com/${repo}/${ref}/logo.png` : null;
    if (logoUrl) accessory = { type: 11, media: { url: logoUrl }, description: `${name} mod logo.` };

    const textComponents = [
        { type: 10, content: `# ${name}` },
        { type: 10, content: `### Release \`v${version}\`` },
    ];
    if (changelogText) textComponents.push({ type: 10, content: changelogText });

    const textSection = { type: 9, components: textComponents };
    if (accessory) textSection.accessory = accessory;

    const body = {
        flags: 32768,
        components: [
            {
                type: 17,
                accent_color: 4176208,
                spoiler: false,
                components: [
                    textSection,
                    {
                        type: 14,
                        spacing: 1,
                        divider: true
                    },
                    {
                        type: 1,
                        components: [
                            {
                                type: 2,
                                style: 5,
                                url: `https://geode-sdk.org/mods/${id}`,
                                label: 'Download',
                                emoji: { name: '⬇️' },
                                disabled: false,
                            },
                        ],
                    },
                ],
            },
        ]
    };

    try {
        const res = await fetch(`${webhookURL}?with_components=true`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const text = await res.text();
            console.error('Failed to send webhook:', res.status, text);
            process.exit(1);
        };

        console.log('Webhook sent successfully');
    } catch (err) {
        console.error('Error sending webhook:', err);
        process.exit(1);
    };
};

main();