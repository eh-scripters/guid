// ==UserScript==
// @name        eh-guid-report-view-new
// @description Appends dead tags and tooltips containing vote data on tags for checkers
// @match       https://e-hentai.org/g/*
// @match       https://exhentai.org/g/*
// @version     1.2
// @grant       GM.xmlHttpRequest
// @author      -terry-
// ==/UserScript==

(() => {
    "use strict";

    const is_eh = window.location.hostname === 'e-hentai.org';
    const taglist_url = `https://repo.e-hentai.org/tools/taglist?gid=${gid}`;
    const uid = document.cookie.match(/ipb_member_id=(\d+)/)[1];
    const gallery_taglist = document.getElementById('taglist');

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.style.display = 'none';
    document.body.appendChild(tooltip);

    // Debug logging - no-op when debug is false to avoid unnecessary overhead
    const debug = false;
    const debug_log = debug ?
        (...args) => console.log('[report-view]:', ...args) :
        () => {};

    const insert_styles = () => {
        if (document.getElementById('eh-guid-report-styles')) return;

        const styles = `
        <style id="eh-guid-report-styles">
            .tooltip { position: absolute; background-color: #EDEBDF; color: #000; padding: 4px; border: 1px solid; border-radius: 4px; font-size: small; max-width: 350px; z-index: 1000; overflow: hidden; }
            .tooltip .score_container { text-align: left; margin-left: 3px; }
            .tooltip .score { font-weight: bold; }
            .tooltip .vetoes { font-weight: bold; }
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
        if (is_eh) { // if the current page is e-hentai, use the native fetch api to get the taglist
            fetch(taglist_url, { credentials: 'include' })
                .then(response => response.text())
                .then(resolve)
                .catch(reject);
        } else { // otherwise, use GM.xmlHttpRequest to get the taglist due to CORS restrictions
            GM.xmlHttpRequest({
                method: 'GET',
                url: taglist_url,
                onload: response => resolve(response.responseText),
                onerror: reject
            });
        }
    });

    const parse_taglist_response = (html_string) => {
        const doc = new DOMParser().parseFromString(html_string, 'text/html');
        const tags = [];
        const master_tag_map = new Map();

        const tag_sections = doc.querySelectorAll('body > div[style*="width:664px"]'); // this is the div that contains all info for each tag
        debug_log(`[parse_taglist_response] Found ${tag_sections.length} tag sections`);
        for (const section of tag_sections) {
            const tag_row = section.querySelector('table tr');
            // <tr>
            // <td style="width:80px; text-align:right">+200 / +3</td> (score_td)
            // <td style="width:50px; text-align:right"><a style="font-weight:bold" href="https://repo.e-hentai.org/tools/tagtrack?filter_tag=parody:pangya">3530</a></td> (id_td)
            // <td style="width:500px"><a style="font-weight:bold" href="https://e-hentai.org/tag/parody:pangya?skip_mastertags=1">parody:pangya</a></td> (tag_td)  
            // </tr>
            if (!tag_row) {
                debug_log('[parse_taglist_response] No tag row found');
                continue;
            }

            const [score_td, id_td, tag_td] = tag_row.children;
            if (!score_td || !id_td || !tag_td) {
                debug_log('[parse_taglist_response] No score, id, or tag td found');
                continue;
            }

            const tag_link = tag_td.querySelector('a');
            if (!tag_link) {
                debug_log('[parse_taglist_response] No tag link found');
                continue;
            }

            const [score, vetoes] = score_td.textContent.trim().split('/').map(s => parseInt(s));
            const tagid = id_td.textContent.trim();

            let tag_text = tag_link.textContent;
            const has_namespace = tag_text.includes(':');
            if (!has_namespace) { // if the tag text does not contain a colon, it is either a slave/blocked tag or a temp tag
                tag_text = isNaN(score) ? `S/B:${tag_text}` : `temp:${tag_text}`; // if the score is NaN, it's a slave or blocked tag, otherwise it's a temp tag
            } else if (isNaN(score)) { // if the tag does contain a colon but the score is NaN, it is a grouped slave/blocked tag
                tag_text = `S/B:${tag_text.split(':')[1]}`; // remove the existing namespace from the tag and instead use S/B:
            }

            const [namespace, tag_name] = tag_text.split(':'); // split the tag text into namespace and tag name

            const user_votes = [];
            const vote_table = section.querySelector('div[style*="float:left; width:400px"] table'); // this is the table that contains all the user votes for the tag
            if (vote_table) {
                for (const row of vote_table.rows) {
                    const [vote_td, user_td, date_td] = row.cells; // get the vote, user, and date td's
                    // <tr>
                    // <td style="width:30px; font-weight:bold; color:green">+10</td> (vote_td)
                    // <td style="width:200px;font-style:italic"><a href="https://repo.e-hentai.org/tools/taglist?uid=223510">sick2000sg</a></td> (user_td)
                    // <td style="width:150px" title="2011-02-28 09:18:39">2011-02-28 09:18</td> (date_td)
                    // </tr>
                    if (!vote_td || !user_td || !date_td) {
                        debug_log('[parse_taglist_response] No vote, user, or date td found');
                        continue;
                    }

                    const user_link = user_td.querySelector('a');
                    if (!user_link) {
                        debug_log('[parse_taglist_response] No user link found');
                        continue;
                    }

                    user_votes.push({
                        vote: vote_td.textContent.trim(),
                        vote_color: vote_td.style.color,
                        username: user_link.textContent,
                        uid: user_link.href.split('uid=')[1],
                        user_color: user_td.style.color || '',
                        date: date_td.textContent.trim()
                    });
                }
            }

            let tag_url = tag_link.href.replace('?skip_mastertags=1', ''); // remove the skip_mastertags=1 query param from the tag url because `tooltip_contents.get(tag_element.href);` does not include the query param
            if (!is_eh) {
                tag_url = tag_url.replace('e-hentai.org', 'exhentai.org'); // change the urls to ex if we are not on eh (show tagged galleries links would link to the wrong site otherwise)
            }

            if (namespace === 'temp' && !tag_url.includes('temp:')) { // if the tag is a temp tag and the url does not already include temp:, add it
                tag_url = tag_url.replace('/tag/', '/tag/temp:');
            }

            const is_slave = !!score_td.querySelector('a[href*="taggroup"]');
            const is_blocked = !!score_td.querySelector('a[href*="tagns"]');

            const tag_data = { namespace, tag_name, tag_url, score, vetoes, user_votes, is_slave, is_blocked };

            if (!is_slave && !is_blocked) { // if the tag is not a slave or blocked tag, add it to the master tag map
                master_tag_map.set(tagid, tag_data);
            }

            if (is_slave) { // if the tag is a slave tag, get the master tag id and add the slave's master tag to the tag data
                const master_tag_id = score_td.querySelector('a[href*="taggroup"]')?.href.split('mastertag=')[1];
                const master_tag = master_tag_map.get(master_tag_id);
                if (master_tag) {
                    tag_data.master_tag = `${master_tag.namespace}:${master_tag.tag_name}`;
                }
            }

            tags.push(tag_data);
            debug_log(`[parse_taglist_response] Parsed tag: ${tag_text}`, { tag_data });
        }

        debug_log(`[parse_taglist_response] Parsed ${tags.length} tags, ${master_tag_map.size} master tags, ${tags.filter(tag => tag.is_slave).length} slave tags, ${tags.filter(tag => tag.is_blocked).length} blocked tags`);
        return tags;
    };

    const append_dead_tags = (tags) => {
        debug_log(`[append_dead_tags] Starting to append/update ${tags.length} tags`);
        const fragment = document.createDocumentFragment();
        let tbody = gallery_taglist.querySelector('tbody');

        if (!tbody) { // Create tbody if it doesn't exist (means there are no visible tags)
            debug_log('[append_dead_tags] No tbody found, creating new one');
            tbody = document.createElement('tbody');
            gallery_taglist.textContent = ''; // clear the "No tags have been added for this gallery yet." text
            gallery_taglist.appendChild(tbody);
        }

        const NAMESPACE_PRIORITY = {
            'temp': 1,
            'S/B': 1
        };

        // Sort tags - temp and blocked tags go to bottom
        tags.sort((a, b) => {
            const a_priority = NAMESPACE_PRIORITY[a.namespace] || 0;
            const b_priority = NAMESPACE_PRIORITY[b.namespace] || 0;
            return a_priority !== b_priority ? a_priority - b_priority :
                a.namespace < b.namespace ? -1 : 1;
        });

        const namespaces = tbody.getElementsByClassName('tc');
        let current_namespace = '';
        let current_td = null;

        for (const tag of tags) {
            const tag_id = `td_${tag.namespace}:${tag.tag_name.split(' ').join('_')}`;
            const existing_tag = document.getElementById(tag_id);
            if (existing_tag) {
                if (tag.vetoes >= 3) { // if 3 positive veto border green
                    existing_tag.style.borderColor = "green";
                } else if (tag.vetoes <= -1) { // if at least 1 negative veto border red
                    existing_tag.style.borderColor = "red";
                }
                debug_log(`[append_dead_tags] Skipping existing tag: ${tag.tag_name}`, { tag_data: tag });
                continue; // skip appending existing tags
            }

            // create or find existing namespace row
            const namespace_key = `${tag.namespace}:`;
            if (namespace_key !== current_namespace) {
                current_namespace = namespace_key;
                current_td = null;

                // find existing namespace row
                for (const ns of namespaces) {
                    if (ns.textContent === namespace_key) {
                        current_td = ns.parentElement.querySelector('td:last-child');
                        break;
                    }
                }
                if (!current_td) { // if the namespace row doesn't exist, create it
                    debug_log(`[append_dead_tags] No namespace row found for ${namespace_key}, creating new one`);
                    const namespace_row = document.createElement('tr');
                    const namespace_td = document.createElement('td');
                    namespace_td.className = 'tc';
                    namespace_td.textContent = namespace_key;
                    namespace_row.appendChild(namespace_td);

                    current_td = document.createElement('td');
                    namespace_row.appendChild(current_td);
                    fragment.appendChild(namespace_row);
                }
            }

            // create tag elements
            const tag_div = document.createElement('div'); // create the tag div like a usual tag in the gallery taglist
            tag_div.id = `td_${tag.namespace}:${tag.tag_name}`;
            tag_div.className = tag.vetoes <= -3 ? 'gt' : tag.vetoes < 0 ? 'gtl' : 'gtw'; // if dead tag is veto'd, set the class to gt, if less than 0 set to gtl, otherwise set to gtw
            tag_div.style.cssText = 'border-color: red; opacity: 0.5;'; // set the border color to red and the opacity to 0.5 for the appended dead tags

            const tag_a = document.createElement('a');
            tag_a.id = `ta_${tag.namespace}:${tag.tag_name}`;
            tag_a.href = tag.tag_url;
            tag_a.textContent = tag.tag_name;
            tag_a.onclick = () => toggle_tagmenu(tag.tag_id, `${tag.namespace}:${tag.tag_name}`, tag_a); // if the tag is clicked, toggle the tagmenu (from the site)

            const voted_by_me = tag.user_votes.some(vote => vote.uid === uid && vote.vote_color === 'green');
            const voted_down_by_me = tag.user_votes.some(vote => vote.uid === uid && vote.vote_color === 'red');
            tag_a.className = voted_by_me ? 'tup' : voted_down_by_me ? 'tdn' : ''; // if the tag has been voted up by the user, set the class to tup, if voted down set to tdn, otherwise set to empty

            tag_div.appendChild(tag_a);
            current_td.appendChild(tag_div);
            debug_log(`[append_dead_tags] Appended tag: ${tag.tag_name}`, { tag_data: tag });
        }

        tbody.appendChild(fragment);
        debug_log('[append_dead_tags] Finished appending dead tags');
    };

    const create_vote_table = (votes) => {
        const table = document.createElement('table');
        const tbody = document.createElement('tbody');

        for (const vote of votes) {
            const row = document.createElement('tr');

            const vote_td = document.createElement('td'); // vote score cell
            vote_td.style.color = vote.vote_color;
            vote_td.style.fontWeight = 'bold';
            vote_td.textContent = vote.vote;

            const user_td = document.createElement('td'); // username cell
            if (vote.user_color) { // if the user color is not empty, set the class to veto_up if the vote color is green, otherwise set to veto_down (vetoers have colored usernames in the taglist)
                user_td.className = vote.vote_color === 'green' ? 'veto_up' : 'veto_down';
            }
            if (vote.uid === uid) { // if the tag has been voted by the user, add a border to that user
                user_td.style.border = '1px solid';
            }
            user_td.textContent = vote.username;

            const date_td = document.createElement('td'); // date cell
            date_td.textContent = `${vote.date}`;

            row.append(vote_td, user_td, date_td);
            tbody.appendChild(row);
        }

        table.appendChild(tbody);
        return table;
    };

    const create_tooltip_content = (tag_data, all_tags) => {
        const fragment = document.createDocumentFragment();

        if (!isNaN(tag_data.score)) { // if the score is not NaN, add the score and vetoes to the tooltip (blocked and slave tags don't have scores so we can ignore them)
            const score_container = document.createElement('div'); // this is the div that contains the total score and total vetoes
            score_container.className = 'score_container';

            const score_span = document.createElement('span');
            score_span.className = 'score';
            score_span.style.color = tag_data.score > 0 ? 'green' : 'black'; // if score is positive, color green, otherwise black
            score_span.textContent = tag_data.score > 0 ? `+${tag_data.score}` : `${tag_data.score}`; // if score is positive, add a + to the score, otherwise don't
            score_container.appendChild(score_span);

            const vetoes_span = document.createElement('span');
            vetoes_span.className = 'vetoes';
            vetoes_span.style.color = tag_data.vetoes > 0 ? 'green' : tag_data.vetoes < 0 ? 'red' : 'black'; // if vetoes is positive, color green, if negative color red, otherwise black
            vetoes_span.textContent = ` (${tag_data.vetoes})`;
            score_container.appendChild(vetoes_span);

            const divider = document.createElement('hr');
            divider.className = 'divider';
            score_container.appendChild(divider);

            fragment.appendChild(score_container);
        }

        if (tag_data.is_blocked) { // if the tag is blocked append a div saying its blocked
            const info = document.createElement('div');
            info.className = 'slave_tag_info';
            info.textContent = 'Blocked tag';
            fragment.appendChild(info);
        } else if (tag_data.is_slave) {
            const info = document.createElement('div');
            info.className = 'slave_tag_info';
            info.textContent = tag_data.master_tag ? `Slave of ${tag_data.master_tag}` : 'Master tag not present'; // if the tag is a slave tag and it has a master tag, add a div with the master tag info, otherwise add a div saying the master tag is not present
            fragment.appendChild(info);
        }

        // Vote table for current tag
        fragment.appendChild(create_vote_table(tag_data.user_votes));

        if (!tag_data.is_slave) { // if the tag is not a slave tag, add a div with the slave tags info
            const slave_tags = all_tags.filter(tag => tag.master_tag === `${tag_data.namespace}:${tag_data.tag_name}`); // get all the slave tags for the master tag
            for (const slave of slave_tags) { // for each slave tag, add a div with the slave tag info
                const slave_info = document.createElement('div');
                slave_info.className = 'slave_tag_info';
                slave_info.textContent = `Slave tag: ${slave.tag_name}`;
                fragment.appendChild(slave_info);
                fragment.appendChild(create_vote_table(slave.user_votes)); // add the vote table for the slave tag
            }
        }

        return fragment;
    };

    const add_tooltips_to_tags = (tags) => {
        debug_log(`[add_tooltips_to_tags] Setting up tooltips for ${tags.length} tags`);
        const tooltip_contents = new Map();

        // pre-generate all tooltip contents
        for (const tag of tags) {
            tooltip_contents.set(tag.tag_url, create_tooltip_content(tag, tags));
        }

        const handle_mouse_enter = (event) => {
            const tag_element = event.target.closest('a'); // get the element of the tag we are hovering over
            if (!tag_element) return;

            const fragment = tooltip_contents.get(tag_element.href); // get the cached tooltip content for the tag we are hovering over
            if (!fragment) return;

            tooltip.innerHTML = ''; // clear the tooltip
            tooltip.appendChild(fragment.cloneNode(true)); // append the cached tooltip content to the tooltip

            const rect = tag_element.getBoundingClientRect(); // get the bounding rectangle of the tag we are hovering over
            tooltip.style.left = `${rect.left + window.scrollX}px`;
            tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
            tooltip.style.display = 'block'; // display the tooltip
        };

        const handle_mouse_leave = (event) => {
            if (event.target.closest('a')) {
                tooltip.style.display = 'none'; // hide the tooltip
            }
        };

        gallery_taglist.addEventListener('mouseenter', handle_mouse_enter, true);
        gallery_taglist.addEventListener('mouseleave', handle_mouse_leave, true);
        debug_log('[add_tooltips_to_tags] Finished setting up tooltips');
    };

    const observe_gallery_taglist = (gallery_taglist) => { // observe the gallery taglist for changes
        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                for (const node of mutation.removedNodes) {
                    if (node.nodeName === 'TABLE') {
                        debug_log('[observe_gallery_taglist] Gallery taglist changed, updating tags');
                        update_tags();
                        return;
                    }
                }
            }
        });
        observer.observe(gallery_taglist, { childList: true });
    };

    const update_tags = async () => { // update all the data if the observer detects a change to the gallery taglist
        tooltip.innerHTML = '';
        tooltip.style.display = 'none';
        try {
            const response = await fetch_taglist();
            const tags = parse_taglist_response(response);
            if (tags.length > 0) {
                append_dead_tags(tags);
                add_tooltips_to_tags(tags);
            }
        } catch (error) {
            console.error('Failed to update tags:', error);
        }
    };

    // initialize the script
    update_tags();
    observe_gallery_taglist(gallery_taglist);
})();
