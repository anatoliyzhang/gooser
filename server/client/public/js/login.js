let username = document.getElementById('username');
let password = document.getElementById('password');
let url = new URL(location.href);
document.getElementById('login_submit').addEventListener('click',async (ev)=>{
    // console.log(username.value,password.value);
    let user = {username:username.value,password:password.value};
    let login_response = await fetch('/login',{
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        mode: 'cors', // no-cors, *cors, same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'include', // include, *same-origin, omit
        headers: {
          'Content-Type': 'application/json',
          // 'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': ''
        },
        redirect: 'follow', // manual, *follow, error
        referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        body: JSON.stringify(user) // body data type must match "Content-Type" header
      });
      // console.log(login_response);
    if (login_response.status == 200) {
      let redirect = url.searchParams.get('redirect');

      if (redirect == null) {parent.location.reload();}
      else{location.replace(redirect);}
    }
    else{
      document.getElementById('error').textContent = 'Error: Username or password is not correct.'
    }
});