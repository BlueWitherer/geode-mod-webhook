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
    const version = mod.version || '0.0.0';
    const id = mod.id || '';

    let accessory = null;
    const repo = process.env.GITHUB_REPOSITORY;
    const tag = (process.env.GITHUB_REF && process.env.GITHUB_REF.startsWith('refs/tags/')) ? process.env.GITHUB_REF.replace('refs/tags/', '') : null;

    const logoUrl = `https://raw.githubusercontent.com/${repo}/refs/tags/${tag}/logo.png`;
    if (logoUrl) accessory = { type: 11, media: { url: logoUrl }, description: `${name} mod logo.` };

    const componentsPayload = {
        components: [
            {
                flags: 32768,
                type: 17,
                accent_color: 4199472,
                spoiler: false,
                components: [
                    {
                        type: 9,
                        components: [
                            { type: 10, content: `# ${name}` },
                            { type: 10, content: `**Release v${version}**` },
                            { type: 10, content: changelogText || '' },
                        ],
                        accessory,
                    },
                    { type: 14, spacing: 1, divider: true },
                    {
                        type: 1,
                        components: [
                            {
                                type: 2,
                                style: 5,
                                url: id ? `https://geode-sdk.org/mods/${id}` : undefined,
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

    function clean(obj) {
        if (Array.isArray(obj)) return obj.map(clean);
        if (obj && typeof obj === 'object') {
            const out = {};
            for (const k of Object.keys(obj)) {
                const v = obj[k];
                if (v === undefined || v === null) continue;
                out[k] = clean(v);
            };

            return out;
        };

        return obj;
    };

    const body = clean(componentsPayload);

    try {
        const res = await fetch(webhookURL, {
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