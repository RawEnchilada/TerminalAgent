import os from 'os';
import fs from 'fs';
import axios from 'axios';
import * as cheerio from 'cheerio';


function getSystemInfo(args) {
    let osInfo = {};

    try {
        const data = fs.readFileSync('/etc/os-release', 'utf8');
        data.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                osInfo[key] = value.replace(/"/g, ''); // Remove quotes around values
            }
        });
    } catch (err) {
        console.error('Could not read /etc/os-release:', err);
    }

    return JSON.stringify({
        os_release: osInfo,
        platform: os.platform(),
        cpu_arch: os.arch(),
        total_memory: os.totalmem(),
        free_memory: os.freemem(),
        uptime_in_seconds: os.uptime(),
    });
}
export function getSystemInfoTool(){
    return {
        type: 'function',
        function: {
            name: 'get_system_info',
            description: 'Get information about the system',
            parameters: {
                type: 'object',
                properties: {},
            },
        },
        callable: getSystemInfo
    }
}
 


async function searchGoogleAndGetFirstPageContent(args) {
    const query = args.query;
    if (!query) {
        return JSON.stringify({ error: 'No query provided' });
    }

    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

    try {
        const response = await axios.get('https://www.google.com/search', {
            params: { q: query },
            headers: { 'User-Agent': userAgent },
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // Find the first result link
        let firstResultLink = null;
        $('div.g').each((i, elem) => {
            const link = $(elem).find('a').attr('href');
            if (link && link.startsWith('http')) {
                firstResultLink = link;
                return false; // Break the loop
            }
        });

        if (!firstResultLink) {
            return JSON.stringify({ error: 'No results found' });
        }

        // Fetch the first result page
        const pageResponse = await axios.get(firstResultLink, {
            headers: { 'User-Agent': userAgent },
        });

        const pageHtml = pageResponse.data;
        const $page = cheerio.load(pageHtml);

        // Remove styles, scripts, and images
        $page('script, style, img').remove();

        const textContent = $page.text();

        return JSON.stringify({ content: textContent.trim() });
    } catch (err) {
        return JSON.stringify({ error: 'Error during search', details: err.message });
    }
}

export function searchGoogleTool() {
    return {
        type: 'function',
        function: {
            name: 'search_google',
            description: 'Search Google and return the first page\'s content without styles, images, and scripts',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'The search query to use on Google',
                    },
                },
                required: ['query'],
            },
        },
        callable: searchGoogleAndGetFirstPageContent,
    };
}
