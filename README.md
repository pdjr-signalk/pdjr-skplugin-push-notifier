# pdjr-skplugin-push-notifier

Forward Signal K notifications over email and web-push.

## Description

**pdjr-skplugin-push-notifier** forwards Signal K notifications using
either email or web-push and to be in any way useful requires an
operating environment that supports at least intermittent Internet
connectivity.

Email messaging requires that the Signal K server has access to a
mail submssion agent (MSA) of some sort.
The plugin uses
[nodemailer](https://nodemailer.com/)
as its mail user agent (MUA) so if an email service works with
```nodemailer``` then it will work with the plugin.

In addition to sending emails the plugin can perform periodic and/or
ad-hoc connection checks against a configured and working MSA.
If, as will normally be the case, your MSA is located out on the
Internet somewhere then the result of these checks can be considered
a proxy for Internet connection state.

Web-push notification requires that the host Signal K server runs with SSL
security enabled and both server and clients must have appropriate X.509
keys either signed and distributed by a trusted authority or (more likely
on a private LAN) self-signed and manually distributed.
Generation of X.509 keys and their distribution and installation on a
private LAN is not covered in detail by this document but is well
documented elsewhere.

Signal K users can subscribe to and unsubscribe from push services using
the plugin's Webapp.

![](./resources/webapp.png)

The plugin is configured by specifying Signal K paths that should be
monitored for notification events and notification methods that
should trigger the issuing of an email message and/or a web-push
notification.

A simple retrieval mechanism allows Signal K paths to be recovered
from third party applications or plugins which expose an appropriate HTTP
API method.
This can be used to integrate the plugin's push services with, for example,
the actions of an alarm notifier.

The plugin exposes an
[HTTP API](https://pdjr-signalk.github.io/pdjr-skplugin-push-notifier/)
and contributes OpenAPI documentation of its interface to the Signal
K OpenAPI service.

## Configuration

<dl>
  <dt>Signal K credentials (<code>credentials</code>)</dt>
  <dd>
    <p>
    This required string must have the form <em>username</em>:<em>password</em>
    providing credentials that will allow the plugin to access the API
    method of another Signal K service over HTTP.
    </p>
    <p>
    You can use the credentials of an existing Signal K user, but you may
    prefer to create a new user for the exclusive use of the plugin.
    </p>
  </dd>
  <dt>Monitor these paths (<code>paths</code>)</dt>
  <dd>
    <p>
    This required a list of strings defines the Signal K paths that the
    plugin should monitor for notifications and any circumstances under
    which the plugin should restart.
    </p>
    <p>
    Each item in the list can be:
    <ul>
      <li>
        a Signal K path (for example <code>tanks.wasteWater.0.currentLevel</code>)
        which should be monitored for notifications; or
      </li>
      <li>
        a URL path specifying an API method that returns a list of Signal K paths
        (for example <code>/plugins/alarm-manager/keys</code>); or
      </li>
      <li>
        a Signal K path of the form 'restart:<em>path</em>' (for example
        <code>restart:notifications.plugins.alarm-manager.keyChange</code>):
        a value change on <em>path</em> will restart the plugin.
      </li>
    </ul>
  </p>
  </dd>
  <dt>Subscriber database (<code>subscriberDatabase</code>)</dt>
  <dd>
    <p>
    This optional property defines the Signal K resource provider that
    will be used to store email and web-push subscriptions.
    </p>
    <p>
    If you omit this property a default value will be used that selects
    the Signal K built-in resource provider (<code>resources-provider</code>)
    and the resource type <code>push-notifier</code>.
    </p>
    <p>
    You must create a custom resource type in the specified resource
    provider configuration that matches the resource type name expected
    by this plugin.
    <dl>
      <dt>Resource provider <code>resourceProvider</code></dt>
      <dd>
        <p>
        The name of the Signal K resource provider that will be
        used to persist subscriber data.
        </p>
      </dd>
      <dt>Resource type <code>resourceType</code></dt>
      <dd>
        <p>
        The name of the resource type under which subscriber data will
        be stored.
        </p>
      </dd>
    </dl>
  </dd>
  <dt>Services <code>services</code></dt>
  <dd>
    <p>
    This required property supplies configuration data for the email
    and web-push services and, for the plugin to do anything, at least
    one of these configurations must be supplied.
    </p>
    <dl>
      <dt>Email <code>email</code></dt>
      <dd>
        <p>
        Optional property supplying configuration data for the email
        service.
        </p>
        <p>
        The plugin uses
        <a href="https://nodemailer.com/">nodemailer</a>
        as its mail user agent and some configuration data must be
        supplied in a format acceptable to this module.
        </p>
        <dl>
          <dt>Methods <code>methods</code></dt>
          <dd>
            <p>
            Property supplying a comma-separated list of Signal K notification
            method names which should trigger the output of an email push
            notification to all users subscribed to the email service.
            </p>
            <p>
            Signal K defines 'visual' and 'sound' as standard notification methods,
            but plugins which create notifications can extend this range.
            See, for example,
            <a href="https://github.com/pdjr-signalk/pdjr-skplugin-alarm-manager">pdjr-skplugin-alarm-manager</a>.
            </p>
          </dd>
          <dt>Nodemailer transport options <code>transportOptions</code></dt>
          <dd>
            <p>
            String containing a JSON encoded object that will be passed
            directly to <code>nodemailer.createTransport()</code> in order
            to configure the connection to your mail submission agent.
            </p>
            <p>
            If you are configuring this property for the first time, then
            the plugin API <code>/status</code> route may return helpful
            debug information.
            <p>
            If you use GMail, then pay particular attention to these
            notes on
            [using Gmail](https://nodemailer.com/usage/using-gmail/).
            </p>
          </dd> 
          <dt>Nodemailer message options <code>messageOptions</code></dt>
          <dd>
            <p>
            String containing a JSON encoded object that will be merged
            with the options generated by the plugin (i.e. "subject",
            "text" and "to") before the result is passed to
            <code>nodemailer.transporter.sendMail()</code>.
            This property must be used to specifying the 'from' address to
            be used in outgoing messages; omitting this property prevents
            email messages being sent (but will still allow connectivity
            checking (see below)).
            </p>
            <p>
            Notwithstanding the plugin's requirements in respect of 'from',
            some email services (notably GMail) will overwrite this
            setting.
          </dd>
          <dt>Connection check interval (m) <code>connectionCheckInterval</code></dt>
          <dd>
            <p>
            Number specifying the frequency of periodic connection checks
            against the mail server specified by <code>transportOptions</code>.
            Zero says never check; <em>n</em> says check every <em>n</em>
            minutes.
            Note that it is always possible to perform an ad-hoc connection
            check using the plugin's HTTP API '/status' URL.
            </p>
          </dd>
        </dl>
      </dd>
      <dt>Web push <code>webpush</code></dt>
      <dd>
        <p>
        Optional property supplying configuration data for the web-push
        service.
        </p>
        <p>
        VAPID keys are required by the push notification protocols.
        These can be easily
        <a href="https://iamstepaul.hashnode.dev/generating-a-secure-vapid-key-for-a-nodejs-project#heading-using-the-comand-line">obtained from the command line</a>
        and the returned values must be made available through either
        the ```transportOptions``` property or by assigning them
        to the environment variables VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY
        and VAPID_SUBJECT from where the plugin can retrieve them.
        </p>
        <dl>
          <dt>Methods <code>methods</code></dt>
          <dd>
            <p>
            Required property supplying a comma-separated list of
            Signal K notification methods which should trigger the
            output of a web-push notification to users subscribed to
            the web-push service.
            </p>
            <p>
            Signal K defines 'visual' and 'sound' as default methods,
            but plugins which create notifications can extend this
            range.
            See, for example,
            <a href="https://github.com/pdjr-signalk/pdjr-skplugin-alarm-manager">pdjr-skplugin-alarm-manager</a>.
            </p>
          </dd>
          <dt>Web-push transport options <code>transportOptions</code></dt>
          <dd>
            <p>
            Optional string containing a JSON encoded object containing
            a 'vapid' object with string properties 'privateKey',
            'publicKey' and 'subject'.
            </p>
            <p>
            If omitted, the the plugin will attempt to recover VAPID
            data from the environment variables
            <code>VAPID_PUBLIC_KEY</code>,
            <code>VAPID_PRIVATE_KEY</code> and
            <code>VAPID_SUBJECT</code>.
            </p>
          </dd>
        </dl>
      </dd>
    </dl>
  </dd>
</dl>

### Configuration example

I use the plugin exclusively for forwarding email and web-push notifications
raised by my alarm manager.

I use Signal K's default resource provider and have saved my VAPID keys
into the server environment, eliminating the requirement to specify the
related properties in my configuration.
My ```push-notifier.json``` configuration file looks like this.
```
{
  "configuration": {
    "credentials": "push-notifier:password",
    "paths": [
      "/plugins/alarm-manager/keys",
      "restart:notifications.plugins.alarm-manager.keyChange"
    ],
    "services": {
      "email": {
        "methods": "push",
        "transportOptions": "{ \"host\": \"smtp.mail.server\", \"port\": 587, \"secure\": false, \"auth\": { \"user\": \"someone@mydomain\", \"pass\": \"mypassword\" }, \"tls\": { \"ciphers\": \"SSLv3\" } }",
        "messageOptions": "{ \"from\": \"noreply@mydomain\" }",
        "connectionCheckInterval": 10
      },
      "webpush": {
        "methods": "push"
      }
    }
  },
  "enabled": true,
  "enableDebug": false
}
```
Considering the ```services.email.transportOptions```  parameter: my mail
service is vanilla SMTP secured with TLS and the transport configuration
object I pass (as a JSON string) to ```transportOptions``` has the form:
```
{
  host: "smtp.mail.server",
  port": 587,
  secure: false,
  auth: {
    user: "myloginid@mydomain",
    pass: "mypassword"
  },
  tls: {
    ciphers: "SSLv3"
  }
}
```
If I used GMail as my MSA, then my configuration object would have a
different form:
```
{
  service: 'gmail',
  auth: {
    user: 'username@gmail.com',
    pass: 'app-specific-password'
  }
}
```
Note that this GMail solution requires two-step verification to be enabled
in Google and an app specific password to be generated for use by the plugin.

### Configuring the host environment

1. Enable Signal K's mDNS (Bonjour) service. The plugin uses this
   to acquire the host system's IP address. 

2. Create a persistent data store where the plugin can save push
   notification subscriptions.
   If you use the plugin defaults for 'subscriberDatabase' then
   configure Signal K's 'Resource Provider (built-in)' plugin to
   support the 'push-notifier' resource type.

3. Recommended. Create a Signal K user with the username and
   password specified in the 'credentials' property.

#### Configuring email use

1. Create (or find online and tweak) a transport configuration object
   for
   [nodemailer](https://nodemailer.com/)
   that allows you to connect to your mail submission agent.

3. Convert the object you create at (1) into a JSON string and
   save the string as the value of the ```transmissionObject```
   property in the plugin configuration.

4. You should now be able to visit the plugin's ```/status``` URL
   and be able and determine whether or not your configuration works.

#### Configuring wep-push notification use

1. Create VAPID keys required by the push notification protocol.
   ```
   $> npm install -g web-push
   $> web-push generate-vapid-keys
   ```

2. Make the VAPID keys generated at (1) available in the Signal K
   execution environment by using a text editor to add the following
   lines to the beginning of the ```signalk-server``` start script
   found in your ```.signalk/``` folder.
   ```
   export VAPID_PUBLIC_KEY=*public key*
   export VAPID_PRIVATE_KEY=*private key*
   export VAPID_SUBJECT=mailto:*some email address*
   ```

4. Configure Signal K to operate using SSL (if it isn't already) by
   running 'signalk-server-setup' and entering 'y' in response to the
   'Do you want to enable SSL?' prompt.

At this point the plugin will be able to manage subscriptions to its
push notification service and will attept to send push notifications
to subscribers when alarm conditions arise in Signal K.
In the unlikely circumstance that your Signal K server has an SSL
certificate issued by an authoritative provider then nothing more needs
to be done.

Mostly though, our Signal K servers operate on a private LAN and we
need to provide an SSL infastructure that will allow the required push
notification protocols to operate securely.
There are a number of ways to achieve this, but I use the simple
expedient of installing self-signed SSL certificates on the Signal K
server and client devices.
This is a little clunky since client certificates have to be manually
installed and authorised on each push notification client.
The details of this procedure differ across operating systems and
browsers, but the general approach is:

1. Generate X.509 keys and certificates.

2. Install server keys in Signal K by copying the necessary files
   to the .signalk folder.

3. Install client keys on required client devices.

4. Most client devices will require you to manually authorise the
   installed client keys.

Without X.509 keys the web-push feature will only be accessible from the
Signal K server host (i.e. the host and client must be the same device).

## Operating principle

The plugin monitors the configured Signal K paths for the appearance
of an alarm notification and for each configured service if the raised
notification has a method value which is trapped by the service then the
notification is forwarded to all users subscribed to that service.

## Author

Paul Reeve <*preeve_at_pdjr_dot_eu*>
