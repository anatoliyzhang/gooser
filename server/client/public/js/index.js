// IFrame.SELECTOR_SIDEBAR_MENU_ITEM = '.nav-item > a.nav-link';
// Generate MENU.
let menus = await fetch_json('/api/query/menus/1=1');
let menus_ele = document.getElementById('menu_tree');
menus.forEach(async menu=>{
    if (menu.parent == 0){
        // console.log(menu)
        let menu_ul = document.createElement('ul');
        menu_ul.className = 'nav nav-treeview';
        if (menu.auto > 0){
            let auto_menu = await fetch_json('/api/query/displays/kind=\''+menu.display_kind+'\'');
            auto_menu.forEach(m=>{menu_ul.appendChild(generate_menu_li(m,false,menu.display_kind))});
            // console.log(auto_menu);
        }
        // console.log(menu_ul);
        let menu_ele = generate_menu_li(menu,true);
        menu_ele.appendChild(menu_ul);
        // menus_ele.appendChild();
        menus_ele.appendChild(menu_ele);
    }

});

// CHECK LOGIN STATUS
let login_button = document.getElementById('login_button');
let logout_button = document.getElementById('logout_button');
if (document.cookie == false) document.cookie = 'SameSite=Lax;';
let is_logged_in = (await fetch_json('/api/status')).logged_in;
// console.log(document.cookie == false );
// console.log(is_logged_in);
if (is_logged_in){
    
    login_button.classList.toggle('d-sm-inline-block');
    logout_button.classList.toggle('d-sm-inline-block');

logout_button.addEventListener('click', async ()=>{
    if ((await fetch_json('/logout')).logout){
        // login_button.classList.toggle('d-sm-inline-block');
        // logout_button.classList.toggle('d-sm-inline-block');
        location.reload();
    }
});
}


async function fetch_json(url) {
    let response = await fetch(url);
    return await response.json();
  }
async function fetch_text(url) {
    let response = await fetch(url);
    return await response.text();
  }
function generate_menu_li(menu,parent,kind){
    let angel_icon = document.createElement('i');
        angel_icon.className = 'right fas fa-angle-left';
        let p_ele = document.createElement('p');
        p_ele.textContent = menu.name;
        // is it a parent menu? if true, then append an angel icon.
    if (parent)    p_ele.appendChild(angel_icon);
    let menu_icon =  document.createElement('i');
    menu_icon.className = 'nav-icon '+ menu.icon_class;
    // if (menu.icon_class){
    // let icon_classes = menu.icon_class.split(' ');
    // icon_classes.forEach(ic=>{menu_icon.classList.add(ic);});
    // }
    let menu_a = document.createElement('a');

    menu_a.setAttribute('href',kind? (kind == 'dashboard'? '/pages/dashboard.html?id='+menu.id:'#'):menu.href);
    menu_a.className = 'nav-link';
    menu_a.appendChild(menu_icon);
    menu_a.appendChild(p_ele);
    let menu_li = document.createElement('li');
    menu_li.className = 'nav-item menu-is-opening menu-open';
    menu_li.appendChild(menu_a);
    return menu_li;
}