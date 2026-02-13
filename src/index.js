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
    const name = mod.name || 'Unknown Mod';
    const description = mod.description || '';
    const id = mod.id || '';
    const source = mod.links?.source || '';

    let version = mod.version || '1.0.0';
    if (version.toLowerCase().startsWith("v")) version = version.slice(1);

    let geode = mod.geode || '1.0.0';
    if (geode.toLowerCase().startsWith("v")) geode = geode.slice(1);

    const repo = process.env.GITHUB_REPOSITORY || '';
    const ref = process.env.GITHUB_REF || '';

    const titleSection = {
        type: 9,
        components: [
            { type: 10, content: `# ${name}` },
            { type: 10, content: `### Release \`v${version}\`` },
            { type: 10, content: `${description}` },
        ],
        accessory: {
            type: 11,
            media: {
                url: `https://raw.githubusercontent.com/${repo}/${ref}/logo.png`
            },
            description: `${name} mod logo.`
        }
    };

    // all the components for the message
    const components = [
        titleSection
    ];

    if (changelogText) components.push(
        {
            type: 14,
            spacing: 1,
            divider: true,
        },
        {
            type: 10,
            content: changelogText,
        },
    );

    const buttons = [
        {
            type: 2,
            style: 5,
            url: `https://geode-sdk.org/mods/${id}`,
            label: 'Download',
            emoji: {
                id: "1471682221881692191",
                name: "downloads",
                animated: false
            },
            disabled: false,
        },
    ];

    if (source) buttons.push(
        {
            type: 2,
            style: 5,
            url: source,
            label: "Source",
            emoji: {
                id: "1471682603106042013",
                name: "GitHub",
                animated: false
            },
            disabled: false,
        },
    );

    components.push(
        {
            type: 14,
            spacing: 1,
            divider: true,
        },
        {
            type: 1,
            components: buttons,
        },
    );

    const body = {
        flags: 32768,
        components: [
            {
                type: 17,
                accent_color: 4176208,
                spoiler: false,
                components: components,
            },
            {
                type: 10,
                content: `-# <t:${Date.now() / 1000}:F> • **Geode \`v${geode}\`**`
            }
        ],
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