const ios = {
	browserName: '',
	platformName: 'iOS',
	os: 'iOS',
	deviceOrientation: 'portrait',
	automationName: 'XCUITest',
	appiumVersion: '1.22.3', // Sauce Labs requires appiumVersion to be specified.
	app: undefined, // Will be set later, locally this is relative to root of project.
	processArguments: {
		args: [ 'uitesting' ],
	},
};

exports.iosLocal = {
	...ios,
	deviceName: 'iPhone 13',
	wdaLaunchTimeout: 240000,
	usePrebuiltWDA: true,
};

exports.iosServer = {
	...ios,
	platformVersion: '15.4', // Supported Sauce Labs platforms can be found here: https://saucelabs.com/rest/v1/info/platforms/appium
	deviceName: 'iPhone 13 Simulator',
};

exports.android = {
	browserName: '',
	platformName: 'Android',
	platformVersion: '11.0',
	deviceName: 'Google Pixel 3 XL GoogleAPI Emulator',
	automationName: 'UiAutomator2',
	os: 'Android',
	appPackage: 'com.gutenberg',
	appActivity: 'com.gutenberg.MainActivity',
	deviceOrientation: 'portrait',
	appiumVersion: '1.22.1',
	app: undefined,
};
