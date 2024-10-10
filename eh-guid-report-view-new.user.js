// ==UserScript==
// @name        eh-guid-report-view-new
// @description Appends dead tags and tooltips containing vote data on tags for checkers
// @match       https://e-hentai.org/g/*
// @match       https://exhentai.org/g/*
// @version     1.1.0
// @grant       GM.xmlhttpRequest
// @authro      -terry-
// ==/UserScript==

/* Differences from the original script:
 * Added comments to explain what the important bits of the code do.
 * Overall improved readability and maintainability of the code, as well as general performance and efficiency.
 * Improved tooltip positioning and styling.
 * Almost everything should look the same, apart from some styling changes to the tooltip.
 * Appended dead tags are styled the same way too, one addition is that alive tags with a veto score of '<= -1' now have a red border.
 * Easier extensibility for future features or improvements thanks to greater modularity such as parsing of the taglist response or creating the vote table from scratch.
 * Slave tags votes are now appended to the master tag's vote table. There is an info tip in the table that tells you which slave tag (multiple are supported too) the votes come from, appended after the current master tag votes.
 * Slaved and blocked tags are now grouped into their own namespace (S/B:). These tags also have an info tip that displays the master tag it belongs to or if it's blocked.
 * Temp tags (that have been downvoted but not grouped) are now grouped into "temp:".w
 * CSS Styles are now injected into the page via a separate function making it easier to modify or add to.
 * More robust error handling.
 * Can be used on fjord.
 * Missing features:
 * Can't toggle the script entirely, or toggle appending dead tags or stop auto updating (would be trivial to add if anyone cares, i never did)
*/

(() => {
    "use strict";

    const gid = window.location.pathname.split('/')[2];
    const taglist_url = `https://repo.e-hentai.org/tools/taglist?gid=${gid}`;
    const uid = document.cookie.match(/ipb_member_id=(\d+)/)[1];

    const gallery_taglist = document.getElementById('taglist');

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.style.display = 'none';
    document.body.appendChild(tooltip);

    const insert_styles = () => {
        if (document.getElementById('eh-guid-report-styles')) return;

        const styles = `
        <style id="eh-guid-report-styles">
            .tooltip { position: absolute; background-color: #EDEBDF; color: #000; padding: 4px; border: 1px solid; border-radius: 4px; font-size: small; max-width: 350px; z-index: 1000; overflow: hidden; }
            .tooltip .score_container { text-align: left; margin-left: 3px; }
            .tooltip .score { font-weight: bold; }
            .tooltip .vetoes { font-weight: bold; }
            .tooltip .spacer { height: 3px; }
            .tooltip .divider { margin-top: 3px; margin-bottom: 3px; border-bottom: 1px solid; }
            .tooltip table { width: 100%; border-collapse: collapse; }
            .tooltip td { padding: 2px 3px; text-align: left; }
            .tooltip tr:nth-child(even) { background-color: #E3E0D1; }
            .tooltip tr:nth-child(odd) { background-color: #EDEBDF; }
            .tooltip .veto_up { background-color: lightgreen; color: black; font-weight: bold; padding: 1px; }
            .tooltip .veto_down { background-color: lightpink; color: black; font-weight: bold; padding: 1px; }
            .tooltip .slave_tag_info { font-style: italic; margin-top:3px; margin-bottom: 3px; background-color: #9999; }
        </style>
        `;
        document.head.insertAdjacentHTML('beforeend', styles);
    };

    insert_styles();

    const fetch_taglist = () => new Promise((resolve, reject) => {
        GM.xmlhttpRequest({
            method: 'GET',
            url: taglist_url,
            onload: response => resolve(response.responseText),
            onerror: reject
        });
    });

    const parse_taglist_response = (html_string) => {
        const doc = new DOMParser().parseFromString(html_string, 'text/html');
        const tags = [];
        let current_master_tag = null;

        const tag_sections = doc.querySelectorAll('div[style="width:664px; margin:auto"]'); // this is the div that contains all info for each tag
        console.log(`Found ${tag_sections.length} tag sections`);
        for (const section of tag_sections) {
            const tag_row = section.querySelector('table tr'); // the row that contains the tag (+200 / +3	3530	parody:pangya)
            const tag_link = tag_row.querySelector('td:nth-child(3) a'); // the link to the tag (<a style="font-weight:bold" href="https://e-hentai.org/tag/parody:pangya?skip_mastertags=1">parody:pangya</a>)
            const score_text = tag_row.querySelector('td:nth-child(1)').textContent; // the score of the tag (+200 / +3)
            const [score, vetoes] = score_text.split('/').map(s => parseInt(s.trim())); // extract the score and vetoes from the score_text

            if (!tag_link) continue;

            let tag_text = tag_link.textContent;
            if (!tag_text.includes(':')) { // if tag doesn't have a namespace, add it
                tag_text = isNaN(score) ? `S/B:${tag_text}` : `temp:${tag_text}`; // if score is NaN, it's a slave or blocked tag, otherwise it's a temp tag
            } else if (isNaN(score)) { // if it has a namespace but score is NaN, it's a slave or blocked tag thats been grouped
                tag_text = `S/B:${tag_text.split(':')[1]}`;
            }
            const [namespace, tag_name] = tag_text.split(':');

            const user_table = section.querySelector('div[style="float:left; width:400px"] table tbody'); // this is the table that contains all the user votes for the tag
            const user_votes = [];
            if (user_table) {
                for (const row of user_table.querySelectorAll('tr')) {
                    const vote_td = row.querySelector('td:first-child'); // the mp/vote of the user
                    const user_td = row.querySelector('td:nth-child(2)'); // the username of the user
                    const date_td = row.querySelector('td:last-child'); // the date of the vote

                    user_votes.push({
                        vote: vote_td.textContent.trim(), // the mp/vote of the user
                        vote_color: vote_td.style.color, // the color of the vote (green = positive vote, red = negative vote)
                        username: user_td.querySelector('a').textContent, // the username of the user
                        uid: user_td.querySelector('a').href.split('uid=')[1], // the uid of the user
                        user_color: user_td.style.color || '', // the color of the username (if the user has a colored username, it's because the vote is a veto) (red = negative vote, green = positive vote)
                        date: date_td.textContent.trim() // the date of the vote
                    });
                }
            }

            const clean_tag_url = tag_link.href.replace('?skip_mastertags=1', ''); // remove ?skip_mastertags=1 from the tag url, i think this was necessary for the href when appending dead tags to work
            const is_slave = !!tag_row.querySelector('td:first-child a[href*="taggroup?mastertag"]'); // if the tag has a taggroup link, it's a slave tag
            const is_blocked = !!tag_row.querySelector('td:first-child a[href*="tagns?searchtag"]'); // if the tag has a tagns , it's a blocked tag

            const tag_data = { namespace, tag_name, tag_url: clean_tag_url, score, vetoes, user_votes, is_slave, is_blocked };

            // slave tags are below the master tag in the taglist, so if current_master_tag is currently null, we set the last tag that is not slaved or blocked as the current master tag
            if (is_slave && !is_blocked && current_master_tag) { // if the current tag is a slave tag and we have a current master tag, set the master tag of this slave tag to the current master tag
                tag_data.master_tag = `${current_master_tag.namespace}:${current_master_tag.tag_name}`;
            } else if (!is_blocked) {
                current_master_tag = tag_data;
            }

            tags.push(tag_data);
        }

        console.log(`Parsed ${tags.length} tags`);
        return tags;
    };

    const create_vote_table = (votes, tag_name = '') => {
        const table = document.createElement('table');
        const tbody = document.createElement('tbody');

        if (tag_name) {
            const header = document.createElement('tr');
            const th = document.createElement('th');
            th.colSpan = 3;
            th.textContent = tag_name;
            header.appendChild(th);
            tbody.appendChild(header);
        }

        for (const vote of votes) {
            const row = document.createElement('tr');

            const vote_td = document.createElement('td');
            vote_td.style.color = vote.vote_color;
            vote_td.style.fontWeight = 'bold';
            vote_td.textContent = vote.vote;

            const user_td = document.createElement('td');
            user_td.className = vote.user_color ? (vote.vote_color === 'green' ? 'veto_up' : 'veto_down') : ''; // if the user color is not empty, set the class to veto_up if the vote color is green, otherwise set to veto_down (vetoers have colored usernames in the taglist)
            if (vote.uid === uid) user_td.style.border = '1px solid'; // if the tag has been voted by the user, add a border to that user
            user_td.textContent = vote.username;

            const date_td = document.createElement('td');
            date_td.textContent = `${vote.date}`;

            row.append(vote_td, user_td, date_td);
            tbody.appendChild(row);
        }

        table.appendChild(tbody);
        return table;
    };

    const update_tooltip_content = (tag_data, all_tags) => {
        const fragment = document.createDocumentFragment();

        const score_color = tag_data.score > 0 ? 'green' : 'black'; // if score is positive, color green, otherwise black
        const score_text = tag_data.score > 0 ? `+${tag_data.score}` : `${tag_data.score}`; // if score is positive, add a + to the score, otherwise don't
        const veto_color = tag_data.vetoes > 0 ? 'green' : tag_data.vetoes < 0 ? 'red' : 'black'; // if vetoes is positive, color green, if negative color red, otherwise black

        if (!isNaN(tag_data.score)) { // if the score is not NaN, add the score and vetoes to the tooltip (blocked and slave tags don't have scores so we can ignore them)
            const score_container = document.createElement('div'); // this is the div that contains the total score and total vetoes
            score_container.className = 'score_container';
            score_container.innerHTML = `
                <span class="score" style="color: ${score_color};">${score_text}</span>
                <span class="vetoes" style="color: ${veto_color};">(${tag_data.vetoes})</span>
                <hr class="divider">
            `;
            fragment.appendChild(score_container);
        }

        if (tag_data.is_blocked) { // if the tag is blocked append a div saying its blocked
            const blocked_info = document.createElement('div');
            blocked_info.className = 'slave_tag_info';
            blocked_info.textContent = `Blocked tag`;
            fragment.appendChild(blocked_info);
        }

        if (tag_data.is_slave && tag_data.master_tag) { // if the tag is a slave tag and it has a master tag, add a div with the master tag info
            const slave_info = document.createElement('div');
            slave_info.className = 'slave_tag_info';
            slave_info.textContent = `Slave of ${tag_data.master_tag}`;
            fragment.appendChild(slave_info);
        }

        fragment.appendChild(create_vote_table(tag_data.user_votes));

        if (!tag_data.is_slave) { // if the tag is not a slave tag, add a div with the slave tags info
            const slave_tags = all_tags.filter(t => t.master_tag === `${tag_data.namespace}:${tag_data.tag_name}`); // get all the slave tags for the master tag
            for (const slave of slave_tags) { // for each slave tag, add a div with the slave tag info
                const slave_info = document.createElement('div');
                slave_info.className = 'slave_tag_info';
                slave_info.textContent = `Slave tag: ${slave.tag_name}`;
                fragment.appendChild(slave_info);
                fragment.appendChild(create_vote_table(slave.user_votes)); // add the vote table for the slave tag
            }
        }

        tooltip.innerHTML = '';
        tooltip.appendChild(fragment);
    };

    const append_dead_tags = (tags) => {
        const gallery_taglist = document.getElementById('taglist');
        const tbody = gallery_taglist.querySelector('tbody');
        const namespaces = tbody.getElementsByClassName('tc');

        tags.sort((a, b) => { // sort the tags so temp and blocked tags are at the bottom
            const priority = (tag) => (tag.namespace === 'temp:' || tag.namespace === 'S/B:') ? 1 : 0;
            const a_priority = priority(a);
            const b_priority = priority(b);

            if (a_priority !== b_priority) return a_priority - b_priority;
            return a.namespace.localeCompare(b.namespace);
        });

        for (const tag of tags) {
            // gonna do this here for now cuz why not
            const existing_tag_div = document.getElementById(`td_${tag.namespace}:${tag.tag_name.split(' ').join('_')}`);
            if (existing_tag_div) {
                if (tag.vetoes >= 3) { // if 3 positive veto border green
                    existing_tag_div.style.borderColor = "green";
                } else if (tag.vetoes <= -1) { // if at least 1 negative veto sc
                    existing_tag_div.style.borderColor = "red";
                }
            }

            if (tag.score !== 0 && !isNaN(tag.score)) continue; // if the score is not 0 and it's not a number, skip it (means it's not a currently visible tag in the gallery taglist)

            let namespace_row = null;
            let tags_td = null;

            for (const ns of namespaces) { // find the namespace row and tags td for the tag
                if (ns.textContent === `${tag.namespace}:`) {
                    namespace_row = ns.parentElement;
                    tags_td = namespace_row.querySelector('td:last-child');
                    break;
                }
            }

            if (!namespace_row) { // if the namespace row doesn't exist, create it
                namespace_row = document.createElement('tr');
                const namespace_td = document.createElement('td');
                namespace_td.className = 'tc';
                namespace_td.textContent = `${tag.namespace}:`;
                namespace_row.appendChild(namespace_td);

                tags_td = document.createElement('td');
                namespace_row.appendChild(tags_td);
                tbody.appendChild(namespace_row);
            }

            const tag_div = document.createElement('div'); // create the tag div like a usual tag in the gallery taglist
            tag_div.id = `td_${tag.namespace}:${tag.tag_name}`;
            tag_div.className = tag.vetoes <= -3 ? 'gt' : tag.vetoes < 0 ? 'gtl' : 'gtw'; // if dead tag is veto'd, set the class to gt, if less than 0 set to gtl, otherwise set to gtw
            tag_div.style.cssText = 'border-color: red; opacity: 0.5;'; // set the border color to red and the opacity to 0.5 for the appended dead tags

            const tag_a = document.createElement('a'); // create the tag a element like a usual tag in the gallery taglist
            tag_a.id = `ta_${tag.namespace}:${tag.tag_name}`;
            tag_a.href = tag.tag_url;
            tag_a.textContent = tag.tag_name;
            tag_a.onclick = () => toggle_tagmenu(tag.tag_id, `${tag.namespace}:${tag.tag_name}`, tag_a); // if the tag is clicked, toggle the tagmenu (from the site)

            const voted_by_me = tag.user_votes.some(vote => vote.uid === uid && vote.vote_color === 'green');
            const voted_down_by_me = tag.user_votes.some(vote => vote.uid === uid && vote.vote_color === 'red');
            tag_a.className = voted_by_me ? 'tup' : voted_down_by_me ? 'tdn' : ''; // if the tag has been voted up by the user, set the class to tup, if voted down set to tdn, otherwise set to empty

            tag_div.appendChild(tag_a);
            tags_td.appendChild(tag_div);
        }
    };

    const add_tooltips_to_tags = (tags) => {
        const tag_map = new Map(tags.map(tag => [tag.tag_url, tag]));
        const taglist = gallery_taglist;

        taglist.addEventListener('mouseenter', (event) => { // when the mouse hovers over a tag
            const tag_element = event.target.closest('a'); // get the element of the tag we are hovering over
            if (!tag_element) return;

            const tag_data = tag_map.get(tag_element.href); // get the taglist data for the tag we are hovering over
            if (!tag_data) return;

            update_tooltip_content(tag_data, tags); // update the tooltip content with the tag data

            const rect = tag_element.getBoundingClientRect(); // get the bounding rectangle of the tag we are hovering over
            tooltip.style.left = `${rect.left + window.scrollX}px`;
            tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
            tooltip.style.display = 'block';
        }, true);

        taglist.addEventListener('mouseleave', (event) => {
            if (event.target.closest('a')) {
                tooltip.style.display = 'none';
            }
        }, true);
    };

    const observe_gallery_taglist = (gallery_taglist) => { // observe the gallery taglist for changes
        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.removedNodes.length > 0 && mutation.removedNodes[0].tagName === 'TABLE') {
                    console.log('Gallery taglist changed, updating tags');
                    update_tags();
                    break;
                }
            }
        });

        observer.observe(gallery_taglist, {
            childList: true
        });
    };

    const update_tags = async () => { // update all the data if the observer detects a change to the gallery taglist
        tooltip.innerHTML = '';
        tooltip.style.display = 'none';
        try {
            const response = await fetch_taglist();
            const tags = parse_taglist_response(response);
            append_dead_tags(tags);
            add_tooltips_to_tags(tags);
        } catch (error) {
            console.error('Failed to fetch taglist:', error);
        }
    };

    // Initialize script
    update_tags();
    observe_gallery_taglist(gallery_taglist);
})();
