// ==UserScript==
// @name        Terry's Mod Scripts - Gallery Taglist View
// @description Shows dead tags and tag-vote details on gallery pages on hover
// @namespace   https://e-hentai.org/
// @match       https://e-hentai.org/g/*
// @match       https://exhentai.org/g/*
// @version     1.0.2
// @grant       GM.addStyle
// @grant       GM.xmlHttpRequest
// @grant       unsafeWindow
// @connect     tools.e-hentai.org
// @author      terry
// @icon        https://e-hentai.org/favicon.ico
// ==/UserScript==

(() => {
    "use strict";

    const page = typeof unsafeWindow === "undefined" ? window : unsafeWindow;
    const taglist = document.getElementById("taglist");
    if (!taglist || !Number.isInteger(page.gid)) return;

    const report_url = `https://tools.e-hentai.org/tools/taglist?gid=${page.gid}`;
    const user_id = String(page.apiuid || "");
    const is_eh = location.hostname === "e-hentai.org";
    const body_style = getComputedStyle(document.body);
    const tooltip = document.createElement("div");
    document.body.append(tooltip);
    tooltip.id = "eh-tag-report";
    tooltip.hidden = true;
    tooltip.style.backgroundColor = body_style.backgroundColor;
    tooltip.style.color = is_eh ? "#000" : body_style.color;
    tooltip.style.setProperty("--link-highlight", is_eh ? "#065fd4" : "#7db7ff");
    let active_tag;
    let tags_by_id = new Map();

    GM.addStyle(`
        #eh-tag-report {
            position: fixed;
            z-index: 1000;
            box-sizing: border-box;
            max-width: min(350px, calc(100vw - 8px));
            max-height: min(600px, calc(100vh - 8px));
            overflow: auto;
            padding: 4px;
            border: 1px solid currentColor;
            border-radius: 4px;
            box-shadow: 0 2px 8px #0006;
            font-size: 13px;
            text-align: left;
        }
        #eh-tag-report table { margin-top: 2px; border-collapse: collapse; }
        #eh-tag-report td { width: auto !important; padding: 1.5px 2.5px; white-space: nowrap; }
        #eh-tag-report tr:nth-child(even) { background: #8882; }
        #eh-tag-report .heading {
            padding: 1px 2px 2px;
            border-bottom: 1px solid currentColor;
            font-weight: bold;
        }
        #eh-tag-report .section td { padding-top: 5px; border-bottom: 1px solid currentColor; font-style: italic; }
        #eh-tag-report .me { font-weight: bold; }
        #eh-tag-report td:nth-child(2), #eh-tag-report td:nth-child(2) a {
            color: inherit;
        }
        #eh-tag-report a { text-decoration: none !important; }
        #eh-tag-report .veto_up, #eh-tag-report .veto_down,
        #eh-tag-report .veto_up a, #eh-tag-report .veto_down a { color: #111 !important; }
        #eh-tag-report .veto_up { background: lightgreen; }
        #eh-tag-report .veto_down { background: lightpink; }
        #eh-tag-report a:is(:hover, :focus) { color: var(--link-highlight) !important; }
        #taglist [data-report-veto="up"] { border-color: green !important; }
        #taglist [data-report-veto="down"] { border-color: red !important; }
        #taglist [data-report-dead] { border-color: red !important; opacity: .5 !important; }
    `);

    const parse_report = (html) => {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const tags = [];

        for (const section of doc.querySelectorAll('body > div[style*="width:664px"]')) {
            const [score_cell, id_cell, name_cell] = section.firstElementChild?.rows[0]?.cells || [];
            const id = Number(id_cell?.textContent);
            const full_name = name_cell?.textContent.trim();
            const name_link = name_cell?.querySelector("a");
            if (!id || !full_name || !name_link) continue;

            const score = score_cell.textContent.replace(/\s+/g, " ").trim();
            const flag_links = [...score_cell.querySelectorAll("a")];
            const flags = new Set(flag_links.map((link) => link.textContent.trim()));
            const special = flags.has("S") || flags.has("B");
            const colon = full_name.indexOf(":");
            const canonical = special || colon >= 0 ? full_name : `temp:${full_name}`;
            const link = new URL(name_link.href);
            const master_link = flag_links.find((a) => a.href.includes("mastertag="));

            link.hostname = location.hostname;
            link.search = "";
            tags.push({
                id,
                canonical,
                key: canonical.replace(/\s+/g, "_"),
                namespace: special ? "S/B" : colon < 0 ? "temp" : full_name.slice(0, colon),
                name: special || colon < 0 ? full_name : full_name.slice(colon + 1),
                url: link.href,
                score,
                vetoes: Number(score.match(/\/ ([+-]?\d+)$/)?.[1]) || 0,
                slave: flags.has("S"),
                blocked: flags.has("B"),
                master_id: Number(master_link && new URL(master_link.href).searchParams.get("mastertag")) || 0,
                votes: section.querySelector('a[href*="uid="]')?.closest("table")?.rows || [],
                slaves: [],
            });
        }

        tags.sort(
            (a, b) =>
                Number(["temp", "S/B"].includes(a.namespace)) - Number(["temp", "S/B"].includes(b.namespace)) ||
                a.namespace.localeCompare(b.namespace)
        );
        return tags;
    };

    const add_vote_rows = (table, tag, label) => {
        if (label) {
            const row = table.insertRow();
            row.className = "section";
            const cell = row.insertCell();
            cell.colSpan = 3;
            cell.textContent = label;
        }

        for (const source of tag.votes) {
            const row = source.cloneNode(true);
            table.tBodies[0].append(row);
            row.cells[2]?.removeAttribute("title");

            const user = row.querySelector('a[href*="uid="]');
            if (!user) continue;

            const id = user.getAttribute("href").match(/[?&]uid=(\d+)/)?.[1];
            const user_cell = user.closest("td");
            const is_vetoer = Boolean(user_cell?.style.color);

            user_cell.style.fontStyle = "";
            if (id === user_id) user_cell.classList.add("me");
            if (is_vetoer) {
                user_cell.style.color = "";
                user_cell.classList.add(row.cells[0].textContent.trim().startsWith("+") ? "veto_up" : "veto_down");
            }
            user.target = "_blank";
            user.rel = "noopener";
        }
    };

    const show_tooltip = (element) => {
        const tag = tags_by_id.get(Number(element.getAttribute("data-report-id")));
        if (!tag) return;

        active_tag = element;
        tooltip.replaceChildren();
        tooltip.style.left = tooltip.style.top = "0";
        const heading = document.createElement("div");
        heading.className = "heading";
        heading.textContent = tag.slave
            ? `Slave of ${tags_by_id.get(tag.master_id)?.canonical || `tag #${tag.master_id}`}`
            : tag.blocked
              ? "Blocked tag"
              : tag.score;
        tooltip.append(heading);

        const table = document.createElement("table");
        table.append(document.createElement("tbody"));
        tooltip.append(table);
        add_vote_rows(table, tag);
        for (const slave of tag.slaves) add_vote_rows(table, slave, `Slave tag: ${slave.name}`);

        tooltip.hidden = false;
        const tag_box = element.getBoundingClientRect();
        const tip_box = tooltip.getBoundingClientRect();
        tooltip.style.left = `${Math.max(4, Math.min(tag_box.left, innerWidth - tip_box.width - 4))}px`;
        tooltip.style.top = `${
            tag_box.bottom + tip_box.height <= innerHeight - 4 ? tag_box.bottom : Math.max(4, tag_box.top - tip_box.height)
        }px`;
    };

    const hide_tooltip = () => {
        active_tag = undefined;
        tooltip.hidden = true;
    };

    const render = (tags) => {
        hide_tooltip();
        taglist.querySelectorAll("[data-report-dead]").forEach((element) => element.remove());

        const body = taglist.querySelector("tbody") || taglist.appendChild(document.createElement("table")).createTBody();
        const cells = new Map([...body.rows].map((row) => [row.querySelector(".tc")?.textContent.trim(), row.lastElementChild]));

        for (const tag of tags) {
            let element = document.getElementById(`td_${tag.key}`);
            if (!element) {
                const namespace = `${tag.namespace}:`;
                let cell = cells.get(namespace);
                if (!cell) {
                    const row = body.insertRow();
                    const label = row.insertCell();
                    label.className = "tc";
                    label.textContent = namespace;
                    cell = row.insertCell();
                    cells.set(namespace, cell);
                }

                element = document.createElement("div");
                cell.append(element);
                element.id = `td_${tag.key}`;
                element.className = tag.vetoes <= -3 ? "gt" : tag.vetoes < 0 ? "gtl" : "gtw";
                element.dataset.reportDead = "";

                const link = document.createElement("a");
                element.append(link);
                link.id = `ta_${tag.key}`;
                link.href = tag.url;
                link.textContent = tag.name;
                link.onclick = () => page.toggle_tagmenu(tag.id, tag.canonical, link);

                const own_vote = [...tag.votes].find((row) => row.querySelector(`a[href$="uid=${user_id}"]`));
                if (own_vote) link.className = own_vote.cells[0].textContent.trim().startsWith("+") ? "tup" : "tdn";
            }

            element.dataset.reportId = tag.id;
            if (tag.vetoes >= 3 || tag.vetoes < 0) element.dataset.reportVeto = tag.vetoes < 0 ? "down" : "up";
        }
    };

    const fetch_report = async () => {
        const response = await GM.xmlHttpRequest({ method: "GET", url: report_url, nocache: true });
        if (response.status >= 400) throw new Error(`HTTP ${response.status}`);
        return response.responseText;
    };

    const refresh = async () => {
        observer.disconnect();
        try {
            const tags = parse_report(await fetch_report());
            if (!tags.length) throw new Error("No tags found");
            tags_by_id = new Map(tags.map((tag) => [tag.id, tag]));
            for (const tag of tags) tags_by_id.get(tag.master_id)?.slaves.push(tag);
            render(tags);
        } catch (error) {
            console.error("[Gallery Taglist View]:", error);
        } finally {
            observer.observe(taglist, { childList: true });
        }
    };
    const observer = new MutationObserver(refresh);

    taglist.addEventListener("pointerover", (event) => {
        const element = event.target.closest("[data-report-id]");
        if (element && element !== active_tag) show_tooltip(element);
    });
    taglist.addEventListener("pointerout", (event) => {
        if (active_tag?.contains(event.target) && !active_tag.contains(event.relatedTarget) && !tooltip.contains(event.relatedTarget))
            hide_tooltip();
    });
    tooltip.addEventListener("pointerleave", hide_tooltip);
    tooltip.addEventListener("focusout", (event) => {
        if (!tooltip.contains(event.relatedTarget) && !active_tag?.contains(event.relatedTarget)) hide_tooltip();
    });
    taglist.addEventListener("focusin", (event) => {
        const element = event.target.closest("[data-report-id]");
        if (element) show_tooltip(element);
    });
    taglist.addEventListener("focusout", (event) => {
        if (!tooltip.contains(event.relatedTarget)) hide_tooltip();
    });
    addEventListener(
        "scroll",
        (event) => {
            if (event.target !== tooltip) hide_tooltip();
        },
        true
    );
    addEventListener("resize", hide_tooltip);
    addEventListener("keydown", (event) => {
        if (event.key === "Escape") hide_tooltip();
    });

    refresh();
})();
