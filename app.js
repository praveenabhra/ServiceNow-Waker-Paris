const puppeteer = require('puppeteer');
const inform = require("./inform");
const config = require("./config");

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run(user) {
	while(lock){
		await sleep(10000);
	}
	console.log('Loading Instance Page');
	lock = true;
	const browser = await puppeteer.launch({headless: true});
	
	const page = await browser.newPage();
	await page.goto('https://developer.service-now.com/dev.do');
	await page.waitFor(3000);
	await page.evaluate(
		() => {
			document.querySelector("body > dps-app").shadowRoot.querySelector("div > header > dps-navigation-header").shadowRoot.querySelector("header > div > div.dps-navigation-header-utility > ul > li:nth-child(2) > dps-login").shadowRoot.querySelector("div > dps-button").shadowRoot.querySelector("button > span").click();
		}
	);
	console.log('Logging as '+user.username);
	await page.waitFor(3000);
	await page.waitForSelector("#username");
	await page.evaluate(
    (username) => {
      document.querySelector("#username").value = username;
    },
	user.username
  );
	await page.click("#usernameSubmitButton");
	await page.waitFor(3000);
	await page.waitForSelector("#password");
	await page.evaluate(
    (password) => {
      document.querySelector("#password").value = password;
	  document.querySelector("#submitButton").click();
    },
	user.password
  );
	await page.waitFor(20000);
	console.log("Logged into Developer Site");

	try {
		await page.waitFor(
			() =>
				document.querySelector("body > dps-app").shadowRoot.querySelector("div > main > dps-home-auth").shadowRoot.querySelector("div > div > div.instance-widget > dps-instance-sidebar").shadowRoot.querySelector("div > div.dps-instance-sidebar-content.dps-instance-sidebar-content-instance-info"),
				{ timeout: 30000}
		);
	}
	catch (e) {
		console.log('Failed to Wakeup the Instance with error : \n'+e);
		browser.close();
		lock = false;
		return;
	}
	
	await page.waitFor(20000);
	const instanceBefore = await getInstanceDetails(page);
	console.log(instanceBefore);
	try{
		await page.evaluate(
			() => {
				document.querySelector("body > dps-app").shadowRoot.querySelector("div > main > dps-home-auth").shadowRoot.querySelector("div > div > div.instance-widget > dps-instance-sidebar").shadowRoot.querySelector("div > div.dps-instance-sidebar-content.dps-instance-sidebar-content-instance-info > div.dps-instance-sidebar-content-btn-group > dps-button").shadowRoot.querySelector("button > span")
				.click();
			}
		);
	}
	catch (e) {
		inform.informFinish(instanceBefore, user.notifications, {
		  awoken: false,
		  msg: "🕒 Instance is already awake!",
		  err: null
		});
		console.log('Instance is already Awake! Exiting....');
		browser.close();
		lock = false;
		return;
	}
	
	console.log("Waking instance, this may take a while...");
	
	try{
		await page.waitFor(
			() =>
				document.querySelector("body > dps-app").shadowRoot.querySelector("div > main > dps-home-auth").shadowRoot.querySelector("div > div > div.instance-widget > dps-instance-sidebar").shadowRoot.querySelector("div > div.dps-instance-sidebar-content.dps-instance-sidebar-content-instance-info > div:nth-child(1) > div").innerText === ' Online',
				{ timeout: 300000 }
		);
	}
	catch(e){
		console.log("Failed to wake instance");
		browser.close();
		lock = false;
		return;
	}
	//await page.screenshot({path: 'ServiceNowDeveloperInstance.png'});
	const instanceAfter = await getInstanceDetails(page);
	console.log(instanceAfter);
	inform.informFinish(instanceAfter, user.notifications, {
		awoken: true,
		msg: "✅ Instance awoken successfully.",
		err: null
	});
	browser.close();
	lock = false;
	return;
}

const user = config.users;
var lock = false;
user.forEach(run);

async function getInstanceDetails(instancePage) {
  return Promise.resolve(
    await instancePage.evaluate(() => {
      var instanceDetail = document.querySelector("body > dps-app").shadowRoot.querySelector("div > main > dps-home-auth").shadowRoot.querySelector("div > div > div.instance-widget > dps-instance-sidebar").shadowRoot.querySelector("div > div.dps-instance-sidebar-content.dps-instance-sidebar-content-instance-info").innerText;
      const instance = {};
        instance.status = document.querySelector("body > dps-app").shadowRoot.querySelector("div > main > dps-home-auth").shadowRoot.querySelector("div > div > div.instance-widget > dps-instance-sidebar").shadowRoot.querySelector("div > div.dps-instance-sidebar-content.dps-instance-sidebar-content-instance-info > div.dps-instance-sidebar-content-row > div").innerText;
		if(instance.status == ' Online'){
			instance.url= document.querySelector("body > dps-app").shadowRoot.querySelector("div > main > dps-home-auth").shadowRoot.querySelector("div > div > div.instance-widget > dps-instance-sidebar").shadowRoot.querySelector("div > div.dps-instance-sidebar-content.dps-instance-sidebar-content-instance-info > div:nth-child(2) > div:nth-child(1) > dps-link").innerText;
			instance.build= document.querySelector("body > dps-app").shadowRoot.querySelector("div > main > dps-home-auth").shadowRoot.querySelector("div > div > div.instance-widget > dps-instance-sidebar").shadowRoot.querySelector("div > div.dps-instance-sidebar-content.dps-instance-sidebar-content-instance-info > div:nth-child(2) > div:nth-child(2) > span").innerText;
			instance.timeRemaining= document.querySelector("body > dps-app").shadowRoot.querySelector("div > main > dps-home-auth").shadowRoot.querySelector("div > div > div.instance-widget > dps-instance-sidebar").shadowRoot.querySelector("div > div.dps-instance-sidebar-content.dps-instance-sidebar-content-instance-info > div:nth-child(2) > div:nth-child(3) > span").innerText; 
		}
	  return instance;
    })
  );
}