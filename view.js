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
function ep_getState(){
  return {
    user: $('#effect_panel').attr('username'),
    file: $('#effect_panel').attr('filepath')
  };
}

function ep_renderContext(){
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

function ep_colorizeRows(){
  const { user, file } = ep_getState();
  if(!user || !file) return;
  $('#effect_panel tr[id^="effect_panel_row_"]').each(function(){
    const perm = $(this).attr('permission_name');
    const allowed = allow_user_action(path_to_file[file], all_users[user], perm);
    $(this).toggleClass('ep-allowed', !!allowed)
           .toggleClass('ep-denied', !allowed);
  });
}

function ep_renderSummary(){
  const { user, file } = ep_getState();
  if(!user || !file) return;
  let total = 0, allowed = 0;
  $('#effect_panel tr[id^="effect_panel_row_"]').each(function(){
    total++;
    const perm = $(this).attr('permission_name');
    if(allow_user_action(path_to_file[file], all_users[user], perm)) allowed++;
  });
  const html = `
  <div id="ep_summary" class="ui-widget ui-widget-content" style="padding:6px 8px;margin:4px 0;font-size:14px">
    <strong>Verify user permissions below.</strong>
  </div>`;

  const panel = $('#effect_panel');
  panel.find('#ep_summary').remove();
  panel.prepend(html);
}

function ep_updateUI(){
  ep_renderContext();
  ep_colorizeRows();
  ep_renderSummary();
}

const $userSelect = define_new_user_select_field('user_select', 'Select User', function(selected_user) {
  $('#effect_panel').attr('username', selected_user);
  ep_updateUI();            // <— triggers chips/colors/summary
});

$('#sidepanel').append($userSelect);


$('#effect_panel').attr('filepath', '/C/presentation_documents/important_file.txt');
$('#effect_panel').attr('username', 'administrator');
ep_updateUI();


   
let info_dialog = define_new_dialog('info_dialog', 'Permission Explanation', { width: 400, height: 250 });



$('.perm_info').click(function() {
  const username   = $('#effect_panel').attr('username');
  const filepath   = $('#effect_panel').attr('filepath');
  const permission = $(this).attr('permission_name');

  const userObj = all_users[username];
  const fileObj = path_to_file[filepath];

  const explanationObj  = allow_user_action(fileObj, userObj, permission, true);
  const explanationText = get_explanation_text(explanationObj);

  const cleanText = explanationText.replace('?:', ':');

  $('#info_dialog').text(cleanText);
  info_dialog.dialog('open');
});

// ---- Display file structure ----

// (recursively) makes and returns an html element (wrapped in a jquery object) for a given file object
function make_file_element(file_obj) {
    let file_hash = get_full_path(file_obj)

    if(file_obj.is_folder) {
        let folder_elem = $(`<div class='folder' id="${file_hash}_div">
            <h3 id="${file_hash}_header">
                <span class="oi oi-folder" id="${file_hash}_icon"/> ${file_obj.filename} 
                <button class="ui-button ui-widget ui-corner-all permbutton" path="${file_hash}" id="${file_hash}_permbutton"> 
                    <span class="oi oi-lock-unlocked" id="${file_hash}_permicon"/> 
                </button>
            </h3>
        </div>`)

        // append children, if any:
        if( file_hash in parent_to_children) {
            let container_elem = $("<div class='folder_contents'></div>")
            folder_elem.append(container_elem)
            for(child_file of parent_to_children[file_hash]) {
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

for(let root_file of root_files) {
    let file_elem = make_file_element(root_file)
    $( "#filestructure" ).append( file_elem);    
}



// make folder hierarchy into an accordion structure
$('.folder').accordion({
    collapsible: true,
    heightStyle: 'content'
}) // TODO: start collapsed and check whether read permission exists before expanding?


// -- Connect File Structure lock buttons to the permission dialog --

// open permissions dialog when a permission button is clicked
$('.permbutton').click( function( e ) {
    // Set the path and open dialog:
    let path = e.currentTarget.getAttribute('path');
    perm_dialog.attr('filepath', path)
    perm_dialog.dialog('open')
    //open_permissions_dialog(path)
// NEW: also sync the Effective Permissions panel on the right
    $('#effect_panel').attr('filepath', path);
    ep_updateUI();
    // Deal with the fact that folders try to collapse/expand when you click on their permissions button:
    e.stopPropagation() // don't propagate button click to element underneath it (e.g. folder accordion)
    // Emit a click for logging purposes:
    emitter.dispatchEvent(new CustomEvent('userEvent', { detail: new ClickEntry(ActionEnum.CLICK, (e.clientX + window.pageXOffset), (e.clientY + window.pageYOffset), e.target.id,new Date().getTime()) }))
});


// ---- Assign unique ids to everything that doesn't have an ID ----
$('#html-loc').find('*').uniqueId() 