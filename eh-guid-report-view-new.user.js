// ==UserScript==
// @name        eh-guid-report-view-new
// @description Appends dead tags and tooltips containing vote data on tags for checkers
// @match       https://e-hentai.org/g/*
// @match       https://exhentai.org/g/*
// @version     1.3.1
// @grant       GM.xmlHttpRequest
// @author      -terry-
// ==/UserScript==

(() => {
    "use strict";

    const is_eh = window.location.hostname === 'e-hentai.org';
    const taglist_url = `https://repo.e-hentai.org/tools/taglist?gid=${gid}`;
    const uid = parseInt(document.cookie.match(/ipb_member_id=(\d+)/)[1]);
    const tooltip_contents = new Map();
    let active_tooltip_target = null; // Track the element the tooltip is for

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.style.display = 'none';
    document.body.append(tooltip);

    // insert styles for the tooltip
    document.head.insertAdjacentHTML('beforeend', `
        <style id="eh-guid-report-styles">
            .tooltip { position: absolute; background-color: #EDEBDF; color: black; padding: 4px; border: 1px solid; border-radius: 6px; font-size: 13px; text-align: left; max-width: 350px; z-index: 1000; }
            .tooltip .score_container { margin: 0 1.5px; }
            .tooltip .score { font-weight: bold; }
            .tooltip .vetoes { font-weight: bold; }
            .tooltip .divider { margin: 3px 0; border-bottom: 1px solid; }
            .tooltip table { border-collapse: collapse; }
            .tooltip td { padding: 1.5px 2.5px; }
            .tooltip tr:nth-child(even) { background-color: #E3E0D1; }
            .tooltip .veto_up { background-color: lightgreen; font-weight: bold; }
            .tooltip .veto_down { background-color: lightpink; font-weight: bold; }
            .tooltip .slave_tag_info { font-style: italic; margin: 3px 0; background-color: #999; text-align: center; }
        </style>
    `);

    const fetch_taglist = async () => {
        try {
            if (is_eh) { // if the current page is e-hentai, use the native fetch api to get the taglist
                const response = await fetch(taglist_url, { credentials: 'include' });
                return await response.text();
            } else { // otherwise, use GM.xmlHttpRequest to bypass CORS restrictions
                const response = await GM.xmlHttpRequest({ url: taglist_url });
                return response.responseText;
            }
        } catch (error) {
            console.error('Failed to fetch taglist:', error);
            return null;
        }
    };

    const parse_taglist = (response) => {
        const doc = new DOMParser().parseFromString(response, 'text/html');
        const tags = [];

        const tag_sections = doc.querySelectorAll('div[style*="width:664px"]'); // this div contains all the info for each tag
        for (const section of tag_sections) {
            const row = section.querySelector('tr');
            // <tr>
            // <td style="width:80px; text-align:right">+200 / +3</td> (score_td)
            // <td style="width:50px; text-align:right"><a style="font-weight:bold" href="https://repo.e-hentai.org/tools/tagtrack?filter_tag=parody:pangya">3530</a></td> (id_td)
            // <td style="width:500px"><a style="font-weight:bold" href="https://e-hentai.org/tag/parody:pangya?skip_mastertags=1">parody:pangya</a></td> (tag_td)
            // </tr>
            const [score_td, id_td, tag_td] = row.cells;
            if (!score_td || !id_td || !tag_td) continue;

            const score_text = score_td.textContent.trim();
            const [score, vetoes] = score_text.includes('/') ? score_text.split('/').map(s => parseInt(s)) : [0, 0];
            const is_slave = score_text.includes('S'); // if the score text contains an S, it is a slave tag
            const is_blocked = score_text.includes('B'); // if the score text contains a B, it is a blocked tag

            const id = parseInt(id_td.textContent.trim());

            let tag_text = tag_td.textContent.trim();
            if (!tag_text.includes(':')) { // if the tag text does not contain a colon, it is either a slave/blocked tag or a temp tag
                tag_text = (is_slave || is_blocked) ? `S/B:${tag_text}` : `temp:${tag_text}`; // if it's a slave or blocked tag, use S/B namespace, otherwise it's a temp tag
            } else if (is_slave || is_blocked) { // if the tag does contain a colon but it's a slave/blocked tag, we want to standardize the namespace
                tag_text = `S/B:${tag_text.split(':')[1]}`; // remove the existing namespace from the tag and instead use S/B:
            }
            const [namespace, name] = tag_text.split(':');

            const vote_data = [];
            const vote_table = section.querySelector('div[style*="float:left; width:400px"] table'); // this div contains the vote table for the tag
            for (const row of vote_table.rows) {
                // <tr>
                // <td style="width:30px; font-weight:bold; color:green">+10</td> (vote_td)
                // <td style="width:200px;font-style:italic"><a href="https://repo.e-hentai.org/tools/taglist?uid=223510">sick2000sg</a></td> (user_td)
                // <td style="width:150px" title="2011-02-28 09:18:39">2011-02-28 09:18</td> (date_td)
                // </tr>
                const [vote_td, user_td, date_td] = row.cells;
                if (!vote_td || !user_td || !date_td) continue;

                vote_data.push({
                    vote: vote_td.textContent.trim(),
                    is_positive: vote_td.textContent.trim().startsWith('+'),
                    username: user_td.textContent.trim(),
                    uid: parseInt(user_td.firstElementChild.href.split('uid=')[1]),
                    is_vetoer: Boolean(user_td.style.color),
                    date: date_td.textContent.trim()
                });
            }

            // create the tag url (the href in tag_td includes ?skip_mastertags=1 and temp tags do not include the namespace in the href so we build the url manually)
            const encoded_tag = `${namespace}:${name}`.replace(/\s+/g, '+');
            const url = `https://${is_eh ? 'e-hentai.org' : 'exhentai.org'}/tag/${encoded_tag}`;

            const tag_data = { id, namespace, name, url, score, vetoes, is_slave, is_blocked, vote_data };

            // if the tag is a slave tag, and the master tag is present in the taglist, add the master_tag property to the tag_data
            if (is_slave) {
                const master_tag_id = parseInt(score_td.firstElementChild.href.split('mastertag=')[1]);
                const master_tag = tags.find(tag => tag.id === master_tag_id);
                if (master_tag) {
                    tag_data.master_tag = `${master_tag.namespace}:${master_tag.name}`;
                }
            }
            tags.push(tag_data);
        }
        return tags;
    }

    const append_dead_tags = (tags, gallery_taglist) => {
        let tbody = gallery_taglist.querySelector('tbody');

        // create tbody if it doesn't exist (means there are no alive tags)
        if (!tbody) {
            tbody = document.createElement('tbody');
            gallery_taglist.textContent = ''; // clear the "No tags have been added for this gallery yet." text
            gallery_taglist.append(tbody);
        }

        // sort namespaces - temp and blocked tags go to bottom
        const priorities = { 'temp': 1, 'S/B': 1 };
        tags.sort((a, b) => {
            const a_priority = priorities[a.namespace] || 0;
            const b_priority = priorities[b.namespace] || 0;
            return a_priority !== b_priority ? a_priority - b_priority :
                a.namespace < b.namespace ? -1 : 1;
        });

        // pre-collect namespace elements and their corresponding cells
        const namespace_map = {};
        const namespaces = tbody.getElementsByClassName('tc');
        for (const ns of namespaces) {
            namespace_map[ns.textContent] = ns.parentElement.querySelector('td:last-child');
        }

        let current_namespace = '';
        let current_td = null;

        for (const tag of tags) {
            const base_id = `${tag.namespace}:${tag.name.replace(/\s+/g, '_')}`;
            const existing_tag = document.getElementById(`td_${base_id}`);
            if (existing_tag) {
                existing_tag.style.borderColor = tag.vetoes >= 3 ? "green" : // if the tag has 3 or more positive vetoes, set the border color to green
                    tag.vetoes <= -1 ? "red" : ""; // if it has at least 1 negative veto, set the border color to red, otherwise set to empty
                continue; // skip appending existing tags
            }

            // create or find existing namespace row
            const namespace_key = `${tag.namespace}:`;
            if (namespace_key !== current_namespace) {
                current_namespace = namespace_key;
                current_td = namespace_map[namespace_key];

                if (!current_td) { // if the namespace row doesn't exist, create it
                    const namespace_row = document.createElement('tr');
                    const namespace_td = document.createElement('td');
                    namespace_td.className = 'tc';
                    namespace_td.textContent = namespace_key;

                    current_td = document.createElement('td');
                    namespace_row.append(namespace_td, current_td);
                    tbody.append(namespace_row);
                }
            }

            // create tag elements like a normal tag in the gallery taglist
            const tag_div = document.createElement('div');
            tag_div.id = `td_${base_id}`;
            tag_div.className = tag.vetoes <= -3 ? 'gt' : tag.vetoes < 0 ? 'gtl' : 'gtw'; // if dead tag is veto'd, set the class to gt (solid), if less than 0 set to gtl (dashed), otherwise set to gtw (dotted)
            tag_div.style.cssText = 'border-color: red; opacity: 0.5;'; // set the border color to red and the opacity to 0.5 for the appended dead tags

            const tag_a = document.createElement('a');
            tag_a.id = `ta_${base_id}`;
            tag_a.href = tag.url;
            tag_a.textContent = tag.name;
            tag_a.onclick = () => toggle_tagmenu(tag.id, `${tag.namespace}:${tag.name}`, tag_a);
            tag_a.className = tag.vote_data.some(vote => vote.uid === uid && vote.is_positive) ? 'tup' : // if the tag has been voted up by the user, set the class to tup
                tag.vote_data.some(vote => vote.uid === uid && !vote.is_positive) ? 'tdn' : ''; // if the tag has been voted down by the user, set the class to tdn, otherwise set to empty

            tag_div.append(tag_a);
            current_td.append(tag_div);
        }
    };

    const create_vote_row = (vote) => {
        const row = document.createElement('tr');

        const vote_td = document.createElement('td');
        vote_td.style.color = vote.is_positive ? 'green' : 'red';
        vote_td.style.fontWeight = 'bold';
        vote_td.textContent = vote.vote;

        const user_td = document.createElement('td');
        if (vote.is_vetoer) {
            user_td.className = vote.is_positive ? 'veto_up' : 'veto_down';
        }
        if (vote.uid === uid) {
            user_td.style.border = '1px solid';
        }
        user_td.textContent = vote.username;

        const date_td = document.createElement('td');
        date_td.textContent = vote.date;

        row.append(vote_td, user_td, date_td);
        return row;
    };

    const create_tooltip_content = (tag_data, all_tags) => {
        const fragment = document.createDocumentFragment();

        if (tag_data.is_slave) {
            const info = document.createElement('div');
            info.className = 'slave_tag_info';
            info.textContent = tag_data.master_tag ? `Slave of ${tag_data.master_tag}` : 'Master tag not present';
            fragment.append(info);
        } else if (tag_data.is_blocked) {
            const info = document.createElement('div');
            info.className = 'slave_tag_info';
            info.textContent = 'Blocked tag';
            fragment.append(info);
        } else {
            const score_container = document.createElement('div');
            score_container.className = 'score_container';

            const score_span = document.createElement('span');
            score_span.className = 'score';
            score_span.style.color = tag_data.score > 0 ? 'green' : 'black';
            score_span.textContent = tag_data.score > 0 ? `+${tag_data.score}` : `${tag_data.score}`;

            const vetoes_span = document.createElement('span');
            vetoes_span.className = 'vetoes';
            vetoes_span.style.color = tag_data.vetoes > 0 ? 'green' : tag_data.vetoes < 0 ? 'red' : 'black';
            vetoes_span.textContent = ` (${tag_data.vetoes})`;

            const divider = document.createElement('hr');
            divider.className = 'divider';

            score_container.append(score_span, vetoes_span, divider);
            fragment.append(score_container);
        }

        const table = document.createElement('table');
        const tbody = document.createElement('tbody');

        // add main tag votes
        for (const vote of tag_data.vote_data) {
            tbody.append(create_vote_row(vote));
        }

        // add slave tag votes if this is a master tag
        const slave_tags = all_tags.filter(tag => tag.master_tag === `${tag_data.namespace}:${tag_data.name}`);
        for (const slave of slave_tags) {
            const slave_info = document.createElement('tr');
            const info_td = document.createElement('td');
            info_td.colSpan = 3;
            info_td.className = 'slave_tag_info';
            info_td.textContent = `Slave tag: ${slave.name}`;
            slave_info.append(info_td);
            tbody.append(slave_info);

            for (const vote of slave.vote_data) {
                tbody.append(create_vote_row(vote));
            }
        }

        table.append(tbody);
        fragment.append(table);
        return fragment;
    };

    const display_tooltip = (target_element) => {
        if (!target_element || !tooltip_contents.has(target_element.href)) {
            tooltip.style.display = 'none';
            active_tooltip_target = null;
            return;
        }

        tooltip.innerHTML = '';
        tooltip.append(tooltip_contents.get(target_element.href).cloneNode(true));

        const rect = target_element.getBoundingClientRect();
        tooltip.style.left = `${rect.left + window.scrollX}px`;
        tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
        tooltip.style.display = 'block';
    };

    const cache_tooltip_contents = (tags) => {
        tooltip_contents.clear();
        // Pre-generate and cache content for all tags
        for (const tag of tags) {
            tooltip_contents.set(tag.url, create_tooltip_content(tag, tags));
        }

        // If a tooltip was active when the cache updated, refresh its content
        if (active_tooltip_target) {
            if (document.body.contains(active_tooltip_target)) {
                display_tooltip(active_tooltip_target);
            } else {
                active_tooltip_target = null;
                tooltip.style.display = 'none';
            }
        }
    };

    const setup_tooltip_events = (gallery_taglist) => {
        const handle_mouse_enter = (event) => {
            const tag_element = event.target.closest('a');
            if (!tag_element) return;

            active_tooltip_target = tag_element;
            display_tooltip(tag_element);
        };

        const handle_mouse_leave = () => {
            tooltip.style.display = 'none';
            active_tooltip_target = null;
        };

        gallery_taglist.addEventListener('mouseenter', handle_mouse_enter, true);
        gallery_taglist.addEventListener('mouseleave', handle_mouse_leave, true);
    };

    const observe_gallery_taglist = (gallery_taglist) => {
        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                for (const node of mutation.removedNodes) {
                    if (node.nodeName === 'TABLE') {
                        update(gallery_taglist);
                        return;
                    }
                }
            }
        });
        observer.observe(gallery_taglist, { childList: true });
    };

    const update = async (gallery_taglist) => {
        const taglist_response = await fetch_taglist();
        if (!taglist_response) return;

        const tags = parse_taglist(taglist_response);
        if (tags.length === 0) return;

        append_dead_tags(tags, gallery_taglist);
        cache_tooltip_contents(tags);
    };

    const init = () => {
        const gallery_taglist = document.getElementById('taglist');
        if (!gallery_taglist) return;

        observe_gallery_taglist(gallery_taglist);
        setup_tooltip_events(gallery_taglist);
        update(gallery_taglist);
    };

    init();
})();
