var VAPID_PUBLIC_KEY = null;

var emailForm, emailAddress1Text, emailAddress2Text, emailSubscribeButton, emailUnsubscribeButton, emailTestButton, emailPanel;
var webpushForm, webpushSubscribeButton, webpushUnsubscribeButton, webpushTestButton, webpushPanel;
var options = null;

window.onload = function() {
  emailForm = document.getElementById('email-form');
  emailAddress1Text = document.getElementById('email-address1-text');
  emailAddress2Text = document.getElementById('email-address2-text');
  emailSubscribeButton = document.getElementById('email-subscribe-button');
  emailUnsubscribeButton = document.getElementById('email-unsubscribe-button');
  emailTestButton = document.getElementById('email-test-button');
  emailPanel = document.getElementById('email-panel')
  emailTestPanel = document.getElementById('email-test-panel');

  webpushForm = document.getElementById('webpush-form');
  webpushSubscribeButton = document.getElementById('webpush-subscribe-button');
  webpushUnsubscribeButton = document.getElementById('webpush-unsubscribe-button');
  webpushTestButton = document.getElementById('webpush-test-button')
  webpushPanel = document.getElementById('webpush-panel');
 
  emailSubscribeButton.addEventListener('click', emailSubscribeButtonHandler);
  emailUnsubscribeButton.addEventListener('click', emailUnsubscribeButtonHandler);
  emailTestButton.addEventListener('click', emailTestButtonHandler);
  webpushSubscribeButton.addEventListener('click', webpushSubscribeButtonHandler);
  webpushUnsubscribeButton.addEventListener('click', webpushUnsubscribeButtonHandler);
  webpushTestButton.addEventListener('click', webpushTestButtonHandler);

  

  try {
    fetch('/plugins/push-notifier/config', { method: 'GET' }).then((response) => {
      if ((response) && (response.status == 200)) {
        response.json().then((responseJSON) => {
          options = responseJSON.configuration;
          //console.log(JSON.stringify(options, null, 2));

          if (!options.services.email) {
            emailForm.disabled = true;
            emailPanel.className = "dimmed";
          } else {
            ;
          }

          if (!options.services.webpush) {
            webpushForm.disabled = true;
            webpushPanel.className = "dimmed";
          } else {
            fetch('/plugins/push-notifier/vapid', { method: 'GET' }).then((response) => {
              if ((response) && (response.status == 200)) {
                response.json().then((responseObject) => {
                  if (responseObject) {
                    VAPID_PUBLIC_KEY = responseObject.publicKey;
                    console.log(VAPID_PUBLIC_KEY);
                    if (registerServiceWorker()) {
                      webpushForm.disabled = false;
                      webpushSubscribeButton.disabled = false;
                    } else throw new Error("error registering service worker");
                  } else throw new Error("invalid response object");
                })
              } else throw new Error("invalid server response");
            });
          }
        });
      }
    });
  } catch(e) {
    
  }
};

async function emailSubscribeButtonHandler() {
  emailSubscribeButton.disabled = true;
  try {
    const subscriberId = validateEmailAddresses(emailAddress1Text.value, emailAddress2Text.value);
    const subscription = { address: subscriberId };
    await subscribe(subscriberId, subscription);
    emailAddress2Text.value = "";
  } catch(e) {
    alert(e.message);
  }
  emailSubscribeButton.disabled = false;
}

async function emailUnsubscribeButtonHandler() {
  emailUnsubscribeButton.disabled = true;
  try {
    const subscriberId = validateEmailAddresses(emailAddress1Text.value, emailAddress2Text.value);
    await unsubscribe(subscriberId);
  } catch(e) {
    alert(e.message);
  }
  emailUnsubscribeButton.disabled = false;
}

async function emailTestButtonHandler() {
  emailTestButton.disabled = true;
  const subscriberId = validateEmailAddresses(emailAddress1Text.value, emailAddress1Text.value);
  const notification = { state: "normal", method: [], message: "Test notification for push-notifier" };
  await test(subscriberId, notification);
  emailTestButton.disabled = false;
}

async function webpushSubscribeButtonHandler() {
  webpushSubscribeButton.disabled = true;
  try {
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      console.info('The user accepted the permission request.');
      const registration = await navigator.serviceWorker.getRegistration();
      var subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY) });
      }
      if (subscription) {
        webpushUnsubscribeButton.disabled = false;
        webpushTestButton.disabled = false;
        const subscriberId = subscription.endpoint.slice(-8);
        console.log("The user has been subscribed for push notifications as subscriber '" + subscriberId + "'");
        await subscribe(subscriberId, subscription);          
      } else console.info("The user could not be subscribed for push notifications");
    } else console.error('The user explicitly denied the push notification permission request');
  } catch(e) {
    console.error(e.message);
  }
}

async function webpushUnsubscribeButtonHandler() {
  webpushUnsubscribeButton.disabled = true;
  try {
    // Start by trying to unsubscribe from browser...
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration.pushManager.getSubscription();
    const subscriberId = subscription.endpoint.slice(-8);
    if (await subscription.unsubscribe()) {
      // And if that worked, then unsubscribe from server
      await unsubscribe(subscriberId);
    }
  } catch(e) {
    console.error(e.message);
  }
  webpushSubscribeButton.disabled = false;
}

async function webpushTestButtonHandler() {
  webpushTestButton.disabled = true;
  try {
    if (await checkConnection()) {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const subscriberId = subscription.endpoint.slice(-8);
          const notification = { state: "normal", method: [], message: "Test notification for push-notifier" };
          await test(subscriberId, notification);
        } else alert("You must subscribe to web-push notifications before you can test your subscription!");
      } else console.error("The user explicitly denied the push notification permission request");
    } else {
      alert("Test request abandoned because server reports WAN connection is down.");
    }  
  } catch(e) { console.error("Web-push test failed (" + e.message + ")"); }
  webpushTestButton.disabled = false;
}

function validateEmailAddresses(addr1, addr2) {
  addr1 = addr1.trim();
  addr2 = addr2.trim();
  const regex = new RegExp("^(?:[A-Z0-9-]+\.)@(?:[A-Z0-9-]+\.)+[A-Z]{2,6}$");
  if ((addr1 != "") && (addr2 != "")) {
    if (addr1 == addr2) {
      //if (regex.test(addr1)) {
        return(addr1);
      //} else throw new Error("email address is invalid");
    } else throw new Error("email addresses do not match");
  } else throw new Error("please enter your email address into both fields");
}

async function subscribe(subscriberId, subscription) {
  fetch('/plugins/push-notifier/subscribe/' + subscriberId, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subscription)}).then((r) => {
    if (r.status == 200) {
      console.info("User '" + subscriberId +"' is subscribed on the server");
    } else {
      throw new Error("User '" + subscriberId + "' could not be subcribed on the server (" + r.status + "%s)");
    }
  });          
}

async function unsubscribe(subscriberId) {
  fetch('/plugins/push-notifier/unsubscribe/' + subscriberId, { method: 'DELETE' }).then((r) => {
    if (r.status === 200) {
      console.info("User '" + subscriberId + "' has been unsubscribed from the server");
    } else {
      throw new Error("User '" + subscriberId + "' could not be unsubscribed from the server (" + r.status + ")");
    }
  });
}

async function test(subscriberId, notification) {
  await fetch('/plugins/push-notifier/push/' + subscriberId, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(notification) }).then((r) => {
    console.info("Server accepted push request");
  }).catch((e) => {
    throw new Error("Server rejected push request");
  });
}

/**
 * @returns - true if server reports WAN connection 'up'.
 */
async function checkConnection() {
  return(
    fetch('/plugins/push-notifier/status', { method: 'GET' })
    .then((response) => response.json())
    .then((body) => { return(body.connection == "up") })
    .catch((e) => { return(false) })
  );
}

function registerServiceWorker() {
  var retval = false;

  if (('serviceWorker' in navigator) && ('PushManager' in window)) {
    navigator.serviceWorker.register('./service-worker.js').then(serviceWorkerRegistration => {
      ;
    }).catch(error => {
      console.error("An error occurred while registering the service worker (" + error + ")");
    });
    retval = true;
  } else {
    console.error("Browser does not support service workers or push messages");
  }
  return(retval);
}

function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray; 
}