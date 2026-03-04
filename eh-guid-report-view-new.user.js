// ==UserScript==
// @name        eh-guid-report-view-new
// @description Appends dead tags and tooltips containing vote data on tags for checkers
// @match       https://e-hentai.org/g/*
// @match       https://exhentai.org/g/*
// @version     1.4.0
// @grant       GM.addStyle
// @grant       GM.xmlHttpRequest
// @author      terry
// ==/UserScript==

/* global unsafeWindow */

(() => {
    "use strict";

    const PAGE = typeof unsafeWindow !== 'undefined' && unsafeWindow ? unsafeWindow : window;

    const is_eh = window.location.hostname === 'e-hentai.org';

    const toggle_tag_menu = (tag_id, canonical_tag_name, tag_anchor) => {
        const fn = PAGE && typeof PAGE.toggle_tagmenu === 'function' ? PAGE.toggle_tagmenu : null;
        if (!fn) return true;
        return fn(tag_id, canonical_tag_name, tag_anchor);
    };

    const gid = (PAGE && typeof PAGE.gid === 'number') ? PAGE.gid : null;
    if (!Number.isFinite(gid)) return;

    const taglist_url = `https://repo.e-hentai.org/tools/taglist?gid=${gid}`;
    const uid = (PAGE && typeof PAGE.apiuid === 'number') ? PAGE.apiuid : null;

    let tags_by_id = new Map(); // tagId -> tag data
    let slaves_by_master_id = new Map(); // masterTagId -> slave tags
    const tooltip_cache = new Map(); // tagId -> DocumentFragment
    let active_tooltip_target = null; // Track the tag div the tooltip is for

    const tooltip = document.createElement('div');
    tooltip.id = 'eh-guid-report-tooltip';
    tooltip.className = 'eh-guid-report-tooltip';
    tooltip.style.display = 'none';
    document.body.append(tooltip);

    GM.addStyle(`
        #eh-guid-report-tooltip { position: absolute; background-color: #EDEBDF; color: black; padding: 4px; border: 1px solid; border-radius: 6px; font-size: 13px; text-align: left; max-width: 350px; z-index: 1000; pointer-events: none; }
        #eh-guid-report-tooltip .score_container { margin: 0 1.5px; }
        #eh-guid-report-tooltip .score { font-weight: bold; }
        #eh-guid-report-tooltip .vetoes { font-weight: bold; }
        #eh-guid-report-tooltip .divider { margin: 3px 0; border-bottom: 1px solid; }
        #eh-guid-report-tooltip table { border-collapse: collapse; }
        #eh-guid-report-tooltip td { padding: 1.5px 2.5px; }
        #eh-guid-report-tooltip tr:nth-child(even) { background-color: #E3E0D1; }
        #eh-guid-report-tooltip .veto_up { background-color: lightgreen; font-weight: bold; }
        #eh-guid-report-tooltip .veto_down { background-color: lightpink; font-weight: bold; }
        #eh-guid-report-tooltip .slave_tag_info { font-style: italic; margin: 3px 0; background-color: #999; text-align: center; }
    `);

    const fetch_taglist = async () => {
        try {
            if (is_eh) { // if the current page is e-hentai, use the native fetch api to get the taglist
                const response = await fetch(taglist_url, { credentials: 'include' });
                return await response.text();
            } else { // otherwise, use GM.xmlHttpRequest to bypass CORS restrictions
                const response = await GM.xmlHttpRequest({ method: 'GET', url: taglist_url });
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
        const tags_by_id = new Map();

        const tag_sections = doc.querySelectorAll('div[style*="width:664px"]'); // this div contains all the info for each tag
        for (const section of tag_sections) {
            const row = section.querySelector('table tr');
            if (!row) continue;
            // <tr>
            // <td style="width:80px; text-align:right">+200 / +3</td> (score_td)
            // <td style="width:50px; text-align:right"><a style="font-weight:bold" href="https://repo.e-hentai.org/tools/tagtrack?filter_tag=parody:pangya">3530</a></td> (id_td)
            // <td style="width:500px"><a style="font-weight:bold" href="https://e-hentai.org/tag/parody:pangya?skip_mastertags=1">parody:pangya</a></td> (tag_td)
            // </tr>
            const [score_td, id_td, tag_td] = row.cells;
            if (!score_td || !id_td || !tag_td) continue;

            const score_text = score_td.textContent.replace(/\s+/g, ' ').trim();
            const numeric_match = score_text.match(/^([+-]?\d+)\s*\/\s*([+-]?\d+)$/);
            const score = numeric_match ? Number.parseInt(numeric_match[1], 10) : 0;
            const vetoes = numeric_match ? Number.parseInt(numeric_match[2], 10) : 0;

            const is_slave = /\bS\b/.test(score_text);
            const is_blocked = /\bB\b/.test(score_text);

            const id = Number.parseInt(id_td.textContent.trim(), 10);
            if (!Number.isFinite(id)) continue;

            const raw_tag_label = tag_td.textContent.trim();
            let canonical_tag_name;
            let namespace;
            let name;

            if (raw_tag_label.includes(':')) {
                const colon_index = raw_tag_label.indexOf(':');
                const raw_ns = raw_tag_label.slice(0, colon_index);
                const raw_name = raw_tag_label.slice(colon_index + 1);
                canonical_tag_name = raw_tag_label;
                name = raw_name;
                namespace = (is_slave || is_blocked) ? 'S/B' : raw_ns;
            } else if (is_slave || is_blocked) {
                canonical_tag_name = raw_tag_label;
                name = raw_tag_label;
                namespace = 'S/B';
            } else {
                canonical_tag_name = `temp:${raw_tag_label}`;
                name = raw_tag_label;
                namespace = 'temp';
            }

            let master_tag_id = null;
            if (is_slave) {
                const href = score_td.querySelector('a[href*="mastertag="]')?.href || '';
                const match = href.match(/mastertag=(\d+)/);
                if (match) master_tag_id = Number.parseInt(match[1], 10);
            }

            const vote_data = [];
            const vote_table = section.querySelector('a[href*="uid="]')?.closest('table') || null;
            if (vote_table) for (const row of vote_table.rows) {
                // <tr>
                // <td style="width:30px; font-weight:bold; color:green">+10</td> (vote_td)
                // <td style="width:200px;font-style:italic"><a href="https://repo.e-hentai.org/tools/taglist?uid=223510">sick2000sg</a></td> (user_td)
                // <td style="width:150px" title="2011-02-28 09:18:39">2011-02-28 09:18</td> (date_td)
                // </tr>
                const [vote_td, user_td, date_td] = row.cells;
                if (!vote_td || !user_td || !date_td) continue;

                const href = user_td.firstElementChild?.href || '';
                const match = href.match(/uid=(\d+)/);
                const vote_uid = match ? Number.parseInt(match[1], 10) : Number.NaN;
                vote_data.push({
                    vote: vote_td.textContent.trim(),
                    is_positive: vote_td.textContent.trim().startsWith('+'),
                    username: user_td.textContent.trim(),
                    uid: Number.isFinite(vote_uid) ? vote_uid : null,
                    is_vetoer: Boolean(user_td.style.color),
                    date: date_td.textContent.trim()
                });
            }

            // Match site behavior.
            const encoded_tag = encodeURIComponent(canonical_tag_name).replace(/%20/g, '+').replace(/%3A/gi, ':');
            const url = `https://${is_eh ? 'e-hentai.org' : 'exhentai.org'}/tag/${encoded_tag}`;

            const tag_data = {
                id,
                canonical_tag_name,
                namespace,
                name,
                url,
                score,
                vetoes,
                is_slave,
                is_blocked,
                master_tag_id: Number.isFinite(master_tag_id) ? master_tag_id : null,
                vote_data
            };

            tags.push(tag_data);
            tags_by_id.set(id, tag_data);
        }

        // Second pass: resolve slave -> master label when possible.
        for (const tag of tags) {
            if (!tag.is_slave || !tag.master_tag_id) continue;
            const master = tags_by_id.get(tag.master_tag_id);
            if (master) tag.master_tag = master.canonical_tag_name;
        }

        return tags;
    };

    const append_dead_tags = (tags, gallery_taglist) => {
        let table = gallery_taglist.querySelector('table');
        let tbody = table?.querySelector('tbody') || null;

        // Create a table/tbody if they don't exist (no visible tags).
        if (!table) {
            gallery_taglist.textContent = '';
            table = document.createElement('table');
            gallery_taglist.append(table);
        }
        if (!tbody) {
            tbody = document.createElement('tbody');
            table.append(tbody);
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

        const existing_tag_ids = new Set();
        for (const div of gallery_taglist.querySelectorAll('div[id^="td_"]')) {
            existing_tag_ids.add(div.id);
        }

        for (const tag of tags) {
            const tag_key = tag.canonical_tag_name.replace(/\s+/g, '_');
            const existing_id = `td_${tag_key}`;
            if (existing_tag_ids.has(existing_id)) {
                const existing_tag = document.getElementById(existing_id);
                if (!existing_tag) continue;
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
            tag_div.id = `td_${tag_key}`;
            tag_div.className = tag.vetoes <= -3 ? 'gt' : tag.vetoes < 0 ? 'gtl' : 'gtw'; // if dead tag is veto'd, set the class to gt (solid), if less than 0 set to gtl (dashed), otherwise set to gtw (dotted)
            tag_div.style.cssText = 'border-color: red; opacity: 0.5;'; // set the border color to red and the opacity to 0.5 for the appended dead tags
            tag_div.dataset.tagId = String(tag.id);

            const tag_a = document.createElement('a');
            tag_a.id = `ta_${tag_key}`;
            tag_a.href = tag.url;
            tag_a.textContent = tag.name;
            tag_a.onclick = () => toggle_tag_menu(tag.id, tag.canonical_tag_name, tag_a);
            tag_a.className = uid && tag.vote_data.some(vote => vote.uid === uid && vote.is_positive) ? 'tup' : // if the tag has been voted up by the user, set the class to tup
                uid && tag.vote_data.some(vote => vote.uid === uid && !vote.is_positive) ? 'tdn' : ''; // if the tag has been voted down by the user, set the class to tdn, otherwise set to empty

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
        if (uid && vote.uid === uid) {
            user_td.style.border = '1px solid';
        }
        user_td.textContent = vote.username;

        const date_td = document.createElement('td');
        date_td.textContent = vote.date;

        row.append(vote_td, user_td, date_td);
        return row;
    };

    const create_tooltip_content = (tag_data) => {
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
        const slave_tags = slaves_by_master_id.get(tag_data.id) || [];
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

    const resolve_tag_id = (tag_div) => {
        if (!tag_div) return null;

        if (tag_div.dataset.tagId) {
            const parsed = Number.parseInt(tag_div.dataset.tagId, 10);
            if (Number.isFinite(parsed)) return parsed;
        }

        const anchor = tag_div.querySelector('a[id^="ta_"]');
        const onclick_attr = anchor?.getAttribute('onclick') || '';
        const match = onclick_attr.match(/toggle_tagmenu\((\d+)\s*,\s*'[^']*'\s*,/);
        if (!match) return null;

        const parsed = Number.parseInt(match[1], 10);
        if (!Number.isFinite(parsed)) return null;
        tag_div.dataset.tagId = String(parsed);
        return parsed;
    };

    const hide_tooltip = () => {
        tooltip.style.display = 'none';
        active_tooltip_target = null;
    };

    const display_tooltip = (tag_div) => {
        const tag_id = resolve_tag_id(tag_div);
        if (!tag_id) return hide_tooltip();

        const tag_data = tags_by_id.get(tag_id);
        if (!tag_data) return hide_tooltip();

        let content = tooltip_cache.get(tag_id);
        if (!content) {
            content = create_tooltip_content(tag_data);
            tooltip_cache.set(tag_id, content);
        }

        tooltip.replaceChildren(content.cloneNode(true));

        const rect = tag_div.getBoundingClientRect();
        tooltip.style.left = `${rect.left + window.scrollX}px`;
        tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
        tooltip.style.display = 'block';
    };

    const set_tag_data = (tags) => {
        tags_by_id = new Map(tags.map(tag => [tag.id, tag]));
        tooltip_cache.clear();

        slaves_by_master_id = new Map();
        for (const tag of tags) {
            if (!tag.is_slave || !tag.master_tag_id) continue;
            if (!slaves_by_master_id.has(tag.master_tag_id)) {
                slaves_by_master_id.set(tag.master_tag_id, []);
            }
            slaves_by_master_id.get(tag.master_tag_id).push(tag);
        }

        if (!active_tooltip_target) return;

        if (!document.body.contains(active_tooltip_target)) {
            hide_tooltip();
            return;
        }

        display_tooltip(active_tooltip_target);
    };

    const setup_tooltip_events = (gallery_taglist) => {
        const on_over = (event) => {
            const tag_div = event.target.closest('#taglist div[id^="td_"]');
            if (!tag_div || !gallery_taglist.contains(tag_div)) return;
            if (tag_div === active_tooltip_target) return;

            active_tooltip_target = tag_div;
            display_tooltip(tag_div);
        };

        const on_out = (event) => {
            if (!active_tooltip_target) return;

            const from_div = event.target.closest('#taglist div[id^="td_"]');
            if (!from_div || from_div !== active_tooltip_target) return;

            const related = event.relatedTarget;
            if (related && from_div.contains(related)) return;

            hide_tooltip();
        };

        gallery_taglist.addEventListener('pointerover', on_over, true);
        gallery_taglist.addEventListener('pointerout', on_out, true);

        window.addEventListener('scroll', hide_tooltip, true);
        window.addEventListener('resize', hide_tooltip, true);
    };

    let update_scheduled = false;
    let update_in_flight = false;
    let update_queued = false;

    const request_update = (gallery_taglist) => {
        if (update_scheduled) return;
        update_scheduled = true;
        queueMicrotask(() => {
            update_scheduled = false;
            run_update(gallery_taglist);
        });
    };

    const run_update = async (gallery_taglist) => {
        if (update_in_flight) {
            update_queued = true;
            return;
        }

        update_in_flight = true;
        try {
            await update(gallery_taglist);
        } finally {
            update_in_flight = false;
        }

        if (update_queued) {
            update_queued = false;
            request_update(gallery_taglist);
        }
    };

    const observe_gallery_taglist = (gallery_taglist) => {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const nodes of [mutation.addedNodes, mutation.removedNodes]) {
                    for (const node of nodes) {
                        if (node.nodeName === 'TABLE') {
                            request_update(gallery_taglist);
                            return;
                        }
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

        set_tag_data(tags);
        append_dead_tags(tags, gallery_taglist);
    };

    const init = () => {
        const gallery_taglist = document.getElementById('taglist');
        if (!gallery_taglist) return;

        setup_tooltip_events(gallery_taglist);
        request_update(gallery_taglist);
        observe_gallery_taglist(gallery_taglist);
    };

    init();
})();
