// ==UserScript==
// @name         eh-guid-taglist-view
// @version      1.2
// @description  Display the Taglist in a more comprehensive way.
// @match        https://repo.e-hentai.org/tools/taglist?uid=*
// @author       -terry-
// @grant        none
// ==/UserScript==

/* Usage:
 * 'Search All Tags' will display all Tags separated into [dead, downvoted, started, upvoted]
 * 'Search Dead Tags' will only display the users dead tags (upvoted by them and killed by someone else)
 * Clicking the Clipboard icon will copy the links to your clipboard
 * Clicking on the tag state (donvoted, started, etc.) will show/hide the gallery links in a scrollbox
 * If you see a tag named 'S' or 'B' they are slaves and deleted temp tags respectively, they are not counted in the totals summary
*/

'use strict';
const data_map = new Map();

const append_buttons = () => {
   const table = document.getElementById('usertaglist');
   if (!table) return;

   const button_container = document.createElement('div');
   button_container.style.textAlign = 'center';

   const all_tags_button = create_button('Search All Tags', () => init(true));
   const dead_tags_button = create_button('Search Dead Tags', () => init(false));

   button_container.appendChild(all_tags_button);
   button_container.appendChild(dead_tags_button);

   table.parentNode.insertBefore(button_container, table);
};

const create_button = (text, on_click) => {
   const button = document.createElement('button');
   button.textContent = text;
   button.style.marginRight = '10px';
   button.addEventListener('click', on_click);
   return button;
};

const init = async (all_tags) => {
   const buttons = document.querySelectorAll('button');
   buttons.forEach(button => {
      button.disabled = true;
      button.style.opacity = '0.5';
   });

   try {
      data_map.clear(); // clear data_map before running
      const page_content = await load_pages(window.location.href.replace(/(&from=\d+)?$/, '')); // cut off the from= part to make sure we start at the beginning of the taglist
      process_data(page_content, all_tags);
      display_results();
   } catch (error) {
      console.error('Error during init:', error);
   } finally {
      buttons.forEach(button => {
         button.disabled = false;
         button.style.opacity = '1';
      });
   }
};


const load_pages = async (url, page_content = '') => {
   try {
      const response = await fetch(url, {
         credentials: 'include',
         mode: 'cors',
      });
      const text = await response.text();
      page_content += text;

      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      const next_link = doc.querySelector('div.navlink a');

      if (next_link) {
         console.log(`Loading page: ${next_link.href}`);
         await new Promise(resolve => setTimeout(resolve, 100));
         return load_pages(next_link.href, page_content);
      }

      return page_content;
   } catch (error) {
      console.error('Error loading pages:', error);
      throw error;
   }
};

const process_data = (page_content, all_tags) => {
   const parser = new DOMParser();
   const doc = parser.parseFromString(page_content, 'text/html');

   const tables = doc.querySelectorAll('#usertaglist');
   for (const table of tables) {
      const rows = table.querySelectorAll('tr');
      for (const row of rows) {
         process_row(row, all_tags);
      }
   }
};

const process_row = (row, all_tags) => {
   const link = row.querySelector('a[href*="/g/"]');
   if (link) {
      extract_tags(row);
   } else {
      const tag_link = row.querySelector('td:last-child a');
      if (tag_link) {
         const tag = tag_link.textContent;
         const vote = row.querySelector('td:nth-child(2)');
         const state = get_tag_state(tag_link, vote);
         if (all_tags || (!all_tags && state === 'dead')) {
            add_tag_data(tag, state, row);
         }
      }
   }
};

const get_tag_state = (tag_link, vote) => {
   if (vote?.style.color === 'red') return 'downvoted';
   if (tag_link?.style.color === 'red') return 'dead';
   if (tag_link?.style.fontStyle === 'italic') return 'started';
   return 'upvoted';
};

const add_tag_data = (tag, state, row) => {
   if (!data_map.has(tag)) {
      data_map.set(tag, { dead: [], downvoted: [], started: [], upvoted: [] });
   }
   const gallery_link = find_gallery_link(row);
   if (gallery_link) {
      data_map.get(tag)[state].push(gallery_link);
   }
};

const find_gallery_link = (row) => {
   let current_row = row.previousElementSibling;
   while (current_row) {
      const link = current_row.querySelector('a[href*="/g/"]');
      if (link) {
         return { href: link.href, name: link.textContent };
      }
      current_row = current_row.previousElementSibling;
   }
   return null;
};

const extract_tags = (link_row) => {
   const link = link_row.querySelector('a[href*="/g/"]');
   if (!link) return;

   const link_href = link.href;
   const link_gallery_name = link.textContent;

   for (const [tag, value] of data_map) {
      for (const state of ['dead', 'downvoted', 'started', 'upvoted']) {
         const index = value[state].findIndex(item => item.href === link_href);
         if (index !== -1) {
            value[state][index] = { href: link_href, name: link_gallery_name };
         }
      }
   }
};

const display_results = () => {
   const results_window = window.open('', 'Comprehensive Tag List View');

   // copy the tag stats from the taglist page
   const tag_stats = document.querySelector('div[style="margin:0 auto 5px; text-align:center"]');
   const tag_number = document.querySelector('p[style]');

   // sort the tags by total amount
   const sorted_tags = Array.from(data_map.entries()).sort((a, b) => {
      const total_a = a[1].dead.length + a[1].downvoted.length + a[1].started.length + a[1].upvoted.length;
      const total_b = b[1].dead.length + b[1].downvoted.length + b[1].started.length + b[1].upvoted.length;
      return total_b - total_a;
   });

   const totals = {
      dead: 0,
      downvoted: 0,
      started: 0,
      upvoted: 0
   };

   for (const [tag, value] of sorted_tags) {
      if (tag.length !== 1) { // skip slaves and deleted temps in total summary
         totals.dead += value.dead.length;
         totals.downvoted += value.downvoted.length;
         totals.started += value.started.length;
         totals.upvoted += value.upvoted.length;
      }
   }

   const tag_cards = sorted_tags.map(([tag, value]) => `
      <div class="tag-card">
         <div class="tag-name">${tag}</div>
         <div class="state-list">
            ${['dead', 'downvoted', 'started', 'upvoted']
            .filter(state => value[state].length > 0)
            .map(state => `
            <div class="state-container">
               <div class="state-header">
                  <span class="state-toggle" onClick="toggle_links(this)">${state} (${value[state].length})</span>
                  <span class="copy-icon" onClick="copy_links(this)" title="Copy links">📋</span>
               </div>
               <div class="state-links">
                  <div class="link-grid">
                     ${value[state].map(link => `
                     <a href="${link.href}" target="_blank" title="${link.name}">
                        ${link.name.length > 30 ? link.name.substring(0, 27) + '...' : link.name}
                     </a>
                     `).join('')}
                  </div>
               </div>
            </div>
            `).join('')}
         </div>
      </div>
      `).join('');

   const html = `
   <html>
   <head>
      <title>Comprehensive Tag List View</title>
      <style>
         body {
            font-family: Arial, sans-serif;
            font-size: 14px;
            color: #333;
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
         }

         h1 {
            font-size: 24px;
            color: #2c3e50;
            margin-bottom: 20px;
            text-align: center;
         }

         .tag-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 10px;
         }

         .tag-card {
            border: 1px solid #ddd;
            padding: 10px;
            border-radius: 8px;
            background-color: #fff;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
         }

         .tag-name {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #2c3e50;
         }

         .state-list {
            font-size: 14px;
         }

         .state-container {
            margin-bottom: 10px;
         }

         .state-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5px;
         }

         .state-toggle {
            cursor: pointer;
            color: #3498db;
            font-weight: bold;
         }

         .state-toggle:hover {
            text-decoration: underline;
         }

         .state-links {
            display: none;
            margin-top: 5px;
         }

         .state-links.show {
            display: block;
         }

         .link-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 5px;
            max-height: 150px;
            overflow-y: auto;
            padding: 5px;
            background-color: #f9f9f9;
            border-radius: 4px;
         }

         .link-grid a {
            display: block;
            padding: 3px 5px;
            color: #3498db;
            text-decoration: none;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-size: 12px;
         }

         .link-grid a:hover {
            background-color: #e8e8e8;
            text-decoration: underline;
         }

         .copy-icon {
            cursor: pointer;
            font-size: 14px;
            color: #7f8c8d;
         }

         .copy-icon:hover {
            color: #34495e;
         }

         ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
         }

         ::-webkit-scrollbar-track {
            background: #f1f1f1;
         }

         ::-webkit-scrollbar-thumb {
            background: #888;
            border-radius: 4px;
         }

         ::-webkit-scrollbar-thumb:hover {
            background: #555;
         }

         .summary-container {
            margin-bottom: 10px;
            background-color: #fff;
            padding: 10px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
         }

         .summary-container h2 {
            font-size: 18px;
            margin-bottom: 10px;
            color: #2c3e50;
         }

         .summary-container p {
            font-size: 14px;
            color: #34495e;
         }
      </style>
   </head>
   <body>
      <div class="summary-container">
         ${tag_stats ? tag_stats.outerHTML : ''}
         ${tag_number ? tag_number.outerHTML : ''}
         <p style="text-align:center">
            Dead: ${totals.dead} |
            Downvoted: ${totals.downvoted} |
            Started: ${totals.started} |
            Upvoted: ${totals.upvoted}
         </p>
      </div>
      <div class="tag-grid">
         ${tag_cards}
      </div>
      <script>
         const toggle_links = (element) => {
            const links = element.closest('.state-container').querySelector('.state-links');
            links.classList.toggle('show');
         };

         const copy_links = (element) => {
            const links = element.closest('.state-container').querySelectorAll('.link-grid a');
            const links_href = Array.from(links).map(link => link.href).join('\\n');
            navigator.clipboard.writeText(links_href).then(() => {
               const icon = element;
               icon.textContent = '✅';
               setTimeout(() => {
                  icon.textContent = '📋';
               }, 800);
            });
         };
      </script>
   </body>
   </html>
   `;

   results_window.document.write(html);
   results_window.document.close();
};
append_buttons();
