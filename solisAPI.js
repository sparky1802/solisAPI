import { fetchData } from './fetchData.js';
import { addDay, monthDays, numOfDays } from './dateTime.js';

//   ---TESTING---
const TEST_CONFIG = JSON.parse(await Deno.readTextFile('./test-config.json'));
const KEY_ID = TEST_CONFIG.keyId;
const KEY_SECRET = TEST_CONFIG.keySecret;
const STATION_ID = TEST_CONFIG.stationId;
const TIMEZONE = TEST_CONFIG.timeZone;
const CURRENCY = TEST_CONFIG.money;

//READ JSON FORMATTED CONFIGURATION FILE
const CONFIG = JSON.parse(await Deno.readTextFile('./config.json'));
//const KEY_ID = CONFIG.keyId;
//const KEY_SECRET = CONFIG.keySecret;
//const STATION_ID = CONFIG.stationId
//const TIMEZONE = CONFIG.timeZone
//const CURRENCY = CONFIG.money

const TODAY = new Date().toISOString().substring(0, 10);
const START_DATE = '2024-01-01';
const YEAR = START_DATE.substring(0, 4);
const MONTH = START_DATE.substring(5, 7);
const END_DATE = '2024-01-01';
//const END_DATE = `${YEAR}-12-${monthDays(MONTH, YEAR)}`;
const DEVICE = 'station';
const ENDPOINT = '7';

//const START_DATE = prompt('Start Date:', '2021-09-01');
//const END_DATE = prompt('End Date:', '2021-09-30');
//const DEVICE = prompt("Device you'd like to query:", 'station');
//const ENDPOINT = prompt('Number you like to use:', '7');
const CANONICALIZED_RESOURCE = CONFIG[DEVICE][ENDPOINT];
const PATH_FILENAME = `./cache/${START_DATE}-${
	CANONICALIZED_RESOURCE.substr(8, CANONICALIZED_RESOURCE.length)
}-${END_DATE}.json`;
const DATA_ARRAY = [];
const DAYS_QUANTITY = numOfDays(START_DATE, END_DATE);
let dayToReturn = START_DATE;
let content;
let nextDay = '';
let solisInfo;

switch (CANONICALIZED_RESOURCE) {
	case '/v1/api/userStationList':
		content = `{"pageNo":"1", "pageSize":"20"}`;
		break;
	case '/v1/api/stationDetail':
		content = `{"id":"${STATION_ID}"}`;
		break;
	default:
		content = 'time';
}
if (content.includes('time') === true) {
	for (let iDay = 0; iDay < DAYS_QUANTITY; iDay++) {
		switch (CANONICALIZED_RESOURCE) {
			case '/v1/api/stationDayEnergyList':
				content =
					`{"pageNo":"1", "pageSize":"20","time":"${dayToReturn}", "stationIds":"${STATION_ID}"}`;
				break;
			case '/v1/api/stationDay':
				content =
					`{"id":"${STATION_ID}", "money":"${CURRENCY}", "time":"${dayToReturn}", "timeZone":"${TIMEZONE}"}`;
				break;
		}
		solisInfo = await getData(content);
		nextDay = addDay(dayToReturn, 1);
		dayToReturn = nextDay;
		DATA_ARRAY.push(solisInfo);
	}
	Deno.writeTextFile(PATH_FILENAME, JSON.stringify(DATA_ARRAY));
} else {
	solisInfo = await getData(content);
	Deno.writeTextFile(PATH_FILENAME, JSON.stringify(solisInfo));
}

async function getData(content) {
	const DATA = await fetchData(
		CANONICALIZED_RESOURCE,
		content,
		KEY_ID,
		KEY_SECRET,
	);
	return JSON.parse(DATA);
}
