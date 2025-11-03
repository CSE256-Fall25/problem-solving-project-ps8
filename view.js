// ---- Define your dialogs  and panels here ----

let effective_permissions = define_new_effective_permissions("effect_panel", add_info_col = true, which_permissions = null);
$('#sidepanel').append(effective_permissions);

// --- lightweight styles for allowed/denied rows
$('head').append(`
  <style>
    .ep-allowed { background: #eef9f0; }  /* subtle green  */
    .ep-denied  { background: #fdf0f0; }  /* subtle red    */
  </style>
`);

// ----- EP (Effective Permissions) helpers: chips + colors + summary -----
function ep_getState() {
    return {
        user: $('#effect_panel').attr('username'),
        file: $('#effect_panel').attr('filepath')
    };
}

function ep_renderContext() {
    const { user, file } = ep_getState();
    const html = `
    <div id="ep_ctx" style="display:flex;gap:8px;margin:6px 0 4px 0">
      <span class="ui-state-active" style="padding:2px 8px;border-radius:12px">User: ${user || '—'}</span>
      <span class="ui-state-active" style="padding:2px 8px;border-radius:12px;max-width:60ch;overflow:hidden;text-overflow:ellipsis">File: ${file || '—'}</span>
    </div>`;
    const panel = $('#effect_panel');
    panel.find('#ep_ctx').remove();
    panel.prepend(html);
}

function ep_colorizeRows() {
    const { user, file } = ep_getState();
    if (!user || !file) return;
    $('#effect_panel tr[id^="effect_panel_row_"]').each(function () {
        const perm = $(this).attr('permission_name');
        const allowed = allow_user_action(path_to_file[file], all_users[user], perm);
        $(this).toggleClass('ep-allowed', !!allowed)
            .toggleClass('ep-denied', !allowed);
    });
}

function ep_renderSummary() {
    const { user, file } = ep_getState();
    if (!user || !file) return;
    let total = 0, allowed = 0;
    $('#effect_panel tr[id^="effect_panel_row_"]').each(function () {
        total++;
        const perm = $(this).attr('permission_name');
        if (allow_user_action(path_to_file[file], all_users[user], perm)) allowed++;
    });
    const html = `
  <div id="ep_summary" class="ui-widget ui-widget-content" style="padding:6px 8px;margin:4px 0;font-size:14px">
    <strong>Verify user permissions below.</strong>
  </div>`;

    const panel = $('#effect_panel');
    panel.find('#ep_summary').remove();
    panel.prepend(html);
}

function ep_updateUI() {
    ep_renderContext();
    ep_colorizeRows();
    ep_renderSummary();
}

// Disable inherited permission checkboxes in the dialog
function disableInheritedPermissions() {
    const filepath = $('#permdialog').attr('filepath');
    const username = $('#permdialog_grouped_permissions').attr('username');

    if (!filepath || !(filepath in path_to_file)) return;
    if (!username || !(username in all_users)) return;

    const fileObj = path_to_file[filepath];

    // If file uses inheritance and has a parent
    if (fileObj.using_permission_inheritance && fileObj.parent !== null) {

        // Disable all checkboxes in the grouped permissions table
        $('#permdialog_grouped_permissions .groupcheckbox').each(function () {
            $(this).prop('disabled', true).css({
                'opacity': '0.5',
                'cursor': 'not-allowed'
            });
        });

        // Gray out all permission rows
        $('#permdialog_grouped_permissions tr[id*="_row_"]').css({
            'opacity': '0.7',
            'background-color': '#f5f5f5'
        });

        // Disable Add/Remove user buttons
        $('#perm_add_user_button, #perm_remove_user').prop('disabled', true).css('opacity', '0.5');

    } else {
        // Re-enable everything if not inherited
        $('#permdialog_grouped_permissions .groupcheckbox').prop('disabled', false).css({
            'opacity': '1',
            'cursor': 'pointer'
        });

        $('#permdialog_grouped_permissions tr[id*="_row_"]').css({
            'opacity': '1',
            'background-color': ''
        });

        $('#perm_add_user_button, #perm_remove_user').prop('disabled', false).css('opacity', '1');
    }
}

$(document).on('selectableselected', '#permdialog_file_user_list', function () {
    setTimeout(function () {
        syncInheritedPermissions();
        disableInheritedPermissions();
    }, 50);
});

// NEW: Update checkbox states to match parent when file uses inheritance
function syncInheritedPermissions() {
    const filepath = $('#permdialog').attr('filepath');
    const username = $('#permdialog_grouped_permissions').attr('username');

    if (!filepath || !(filepath in path_to_file)) return;
    if (!username || !(username in all_users)) return;

    const fileObj = path_to_file[filepath];

    // If file uses inheritance and has a parent
    if (fileObj.using_permission_inheritance && fileObj.parent !== null) {
        const parentObj = fileObj.parent;

        // For each permission group row, check parent's permissions and update checkboxes
        $('#permdialog_grouped_permissions tr[id*="_row_"]').each(function () {
            const rowId = $(this).attr('id');
            const groupName = rowId.replace('permdialog_grouped_permissions_row_', '');

            if (groupName === 'Special_permissions') return; // Skip special permissions

            const permissionsList = permission_groups[groupName];
            if (!permissionsList) return;

            // Check if ALL permissions in this group are allowed by parent
            let allAllowed = true;
            for (let perm of permissionsList) {
                if (!allow_user_action(parentObj, username, perm)) {
                    allAllowed = false;
                    break;
                }
            }

            // Update the checkboxes to match parent
            const allowCheckbox = $(`#permdialog_grouped_permissions_${groupName}_allow_checkbox`);
            const denyCheckbox = $(`#permdialog_grouped_permissions_${groupName}_deny_checkbox`);

            allowCheckbox.prop('checked', allAllowed);
            denyCheckbox.prop('checked', false);
        });
    }
}

const $userSelect = define_new_user_select_field('user_select', 'Select User', function (selected_user) {
    $('#effect_panel').attr('username', selected_user);
    ep_updateUI();            // <— triggers chips/colors/summary
});

$('#sidepanel').append($userSelect);


$('#effect_panel').attr('filepath', '/C/presentation_documents/important_file.txt');
$('#effect_panel').attr('username', 'administrator');
ep_updateUI();



let info_dialog = define_new_dialog('info_dialog', 'Permission Explanation', { width: 400, height: 250 });



$('.perm_info').click(function () {
    const username = $('#effect_panel').attr('username');
    const filepath = $('#effect_panel').attr('filepath');
    const permission = $(this).attr('permission_name');

    const userObj = all_users[username];
    const fileObj = path_to_file[filepath];

    const explanationObj = allow_user_action(fileObj, userObj, permission, true);
    const explanationText = get_explanation_text(explanationObj);

    const cleanText = explanationText.replace('?:', ':');

    $('#info_dialog').text(cleanText);
    info_dialog.dialog('open');
});

// ---- Display file structure ----

// (recursively) makes and returns an html element (wrapped in a jquery object) for a given file object
function make_file_element(file_obj) {
    let file_hash = get_full_path(file_obj)

    if (file_obj.is_folder) {
        let folder_elem = $(`<div class='folder' id="${file_hash}_div">
            <h3 id="${file_hash}_header">
                <span class="oi oi-folder" id="${file_hash}_icon"/> ${file_obj.filename} 
                <button class="ui-button ui-widget ui-corner-all permbutton" path="${file_hash}" id="${file_hash}_permbutton"> 
                    <span class="oi oi-lock-unlocked" id="${file_hash}_permicon"/> 
                </button>
            </h3>
        </div>`)

        // append children, if any:
        if (file_hash in parent_to_children) {
            let container_elem = $("<div class='folder_contents'></div>")
            folder_elem.append(container_elem)
            for (child_file of parent_to_children[file_hash]) {
                let child_elem = make_file_element(child_file)
                container_elem.append(child_elem)
            }
        }
        return folder_elem
    }
    else {
        return $(`<div class='file'  id="${file_hash}_div">
            <span class="oi oi-file" id="${file_hash}_icon"/> ${file_obj.filename}
            <button class="ui-button ui-widget ui-corner-all permbutton" path="${file_hash}" id="${file_hash}_permbutton"> 
                <span class="oi oi-lock-unlocked" id="${file_hash}_permicon"/> 
            </button>
        </div>`)
    }
}

for (let root_file of root_files) {
    let file_elem = make_file_element(root_file)
    $("#filestructure").append(file_elem);
}

// Disable permission buttons for files using inheritance
function updatePermButtonStates() {
    $('.permbutton').each(function () {
        const path = $(this).attr('path');
        if (path && path in path_to_file) {
            const fileObj = path_to_file[path];

            // Check if file uses inheritance and has a parent
            if (fileObj.using_permission_inheritance && fileObj.parent !== null) {
                // Gray out and disable the button
                $(this).prop('disabled', true)
                    .css({
                        'opacity': '0.5',
                        'cursor': 'not-allowed',
                        'pointer-events': 'none'
                    });

                // Update the icon to show it's locked/inherited
                $(this).find('span.oi').removeClass('oi-lock-unlocked')
                    .addClass('oi-lock-locked');
            } else {
                // Enable the button (in case it was previously disabled)
                $(this).prop('disabled', false)
                    .css({
                        'opacity': '1',
                        'cursor': 'pointer',
                        'pointer-events': 'auto'
                    });

                $(this).find('span.oi').removeClass('oi-lock-locked')
                    .addClass('oi-lock-unlocked');
            }
        }
    });
}

// Call this after creating the file structure
updatePermButtonStates();


// make folder hierarchy into an accordion structure
$('.folder').accordion({
    collapsible: true,
    heightStyle: 'content'
}) // TODO: start collapsed and check whether read permission exists before expanding?


// -- Connect File Structure lock buttons to the permission dialog --

// open permissions dialog when a permission button is clicked
$('.permbutton').click(function (e) {
    let path = e.currentTarget.getAttribute('path');
    perm_dialog.attr('filepath', path)
    perm_dialog.dialog('open')

    $('#effect_panel').attr('filepath', path);
    ep_updateUI();


    // NEW: Sync checkboxes with parent, then disable them
    setTimeout(function () {
        syncInheritedPermissions();
        disableInheritedPermissions();

    }, 100);

    e.stopPropagation()
    emitter.dispatchEvent(new CustomEvent('userEvent', { detail: new ClickEntry(ActionEnum.CLICK, (e.clientX + window.pageXOffset), (e.clientY + window.pageYOffset), e.target.id, new Date().getTime()) }))
});

// ---- Assign unique ids to everything that doesn't have an ID ----
$('#html-loc').find('*').uniqueId()
















// ---------- Hover pop-ups (tooltips) for lock buttons and info chips ----------

// (Optional) a tiny helper: escape HTML & format the multi-line explanation into <br> lines.
function ep_escape_html(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
function ep_format_explanation_html(expl) {
    // get_explanation_text returns a multi-line string; convert safely to simple HTML
    const raw = get_explanation_text(expl);
    return ep_escape_html(raw).replace(/\n\s*/g, '<br>');
}

// Give permbuttons accessible labels (helps keyboard/screen readers)
$('.permbutton').each(function () {
    const path = $(this).attr('path');
    if (path && path in path_to_file) {
        const f = path_to_file[path];
        const kind = f.is_folder ? 'folder' : 'file';
        $(this).attr('aria-label', `Open permissions for ${kind} "${f.filename}"`);
    } else {
        $(this).attr('aria-label', 'Open permissions');
    }
});

// Initialize a single delegated tooltip for both targets.
// jQuery UI tooltip re-queries `content` each time it opens, so it stays up-to-date
// as the selected user/file changes.
$(document).tooltip({
    items: '.permbutton, .perm_info',
    track: true,
    show: { delay: 200 },
    hide: { delay: 120 },
    position: { my: 'left+12 center', at: 'right center' },
    content: function (callback) {
        const $t = $(this);

        // 1) Lock buttons in the file tree
        if ($t.hasClass('permbutton')) {
            const path = $t.attr('path');
            const user = $('#effect_panel').attr('username') || '—';
            if (path && path in path_to_file) {
                const f = path_to_file[path];
                const kind = f.is_folder ? 'Folder' : 'File';
                const html = `
          <div>
            <strong>${kind}:</strong> ${ep_escape_html(f.filename)}<br>
            <em>Click</em> to open permissions editor.<br>
            <small>Current user: ${ep_escape_html(user)}</small>
          </div>`;
                return callback(html);
            }
            return callback('Open permissions');

            // 2) Info icons in the Effective Permissions panel
        } else if ($t.hasClass('perm_info')) {
            const permission = $t.attr('permission_name');
            const username = $('#effect_panel').attr('username');
            const filepath = $('#effect_panel').attr('filepath');

            if (permission && username && filepath &&
                (username in all_users) && (filepath in path_to_file)) {

                const expl = allow_user_action(path_to_file[filepath], all_users[username], permission, true);
                // Clean up any odd punctuation and format lines
                const html = ep_format_explanation_html(expl).replace('?:', ':');
                return callback(html);
            }
            return callback('Select a user and file to see details.');
        }

        // Fallback to any native title attr
        return callback($t.attr('title') || '');
    }
});

// Optional: style tweaks for nicer tooltip width
$('head').append(`
  <style>
    .ui-tooltip {
      max-width: 36rem;
      line-height: 1.25;
      font-size: 0.95rem;
      white-space: normal;
    }
  </style>
`);

// ---------- Hover tooltip for the "Select User" button (consistent with lock icon tooltips) ----------

// Give the button a title attribute (optional, for accessibility)
$('#user_select_button').attr('aria-label', 'Select a user');
$('#user_select_button').attr('title', 'Click to change which user’s permissions are shown and can be modified.');

// Add to the same jQuery UI tooltip system as other items
$(document).tooltip({
    items: '.permbutton, .perm_info, #user_select_button',
    track: true,
    show: { delay: 200 },
    hide: { delay: 120 },
    position: { my: 'left+12 center', at: 'right center' },
    content: function (callback) {
        const $t = $(this);

        // Reuse existing logic for permission buttons
        if ($t.hasClass('permbutton')) {
            const path = $t.attr('path');
            const user = $('#effect_panel').attr('username') || '—';
            if (path && path in path_to_file) {
                const f = path_to_file[path];
                const kind = f.is_folder ? 'folder' : 'file';
                return callback(`
          <div>
            <strong>${kind}:</strong> ${f.filename}<br>
            <em>Click</em> to open permissions editor.<br>
            <small>Current user: ${user}</small>
          </div>
        `);
            }
            return callback('Open permissions');
        }

        // Reuse existing logic for info icons
        if ($t.hasClass('perm_info')) {
            const permission = $t.attr('permission_name');
            const username = $('#effect_panel').attr('username');
            const filepath = $('#effect_panel').attr('filepath');
            if (permission && username && filepath &&
                (username in all_users) && (filepath in path_to_file)) {
                const expl = allow_user_action(path_to_file[filepath], all_users[username], permission, true);
                const html = get_explanation_text(expl).replace(/\n\s*/g, '<br>').replace('?:', ':');
                return callback(html);
            }
            return callback('Select a user and file to see details.');
        }

        // ✨ New: tooltip for "Select User" button
        if ($t.is('#user_select_button')) {
            return callback(`
        <div>
          <strong>Select User:</strong><br>
          Click this button to change which user’s permissions are displayed and can be modified below.
        </div>
      `);
        }

        // fallback for any other title attributes
        return callback($t.attr('title') || '');
    }
});

