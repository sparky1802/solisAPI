import { formatDateTimeLocal } from './dateTime.js';
import { MongoClient } from 'npm:mongodb@6';

const URL = 'mongodb://localhost:27017';
const CLIENT = new MongoClient(URL);
const DB_NAME = 'solarDB';
const COLL_NAME = 'consumedGenerated';

const CHECK_DB = await checkDb();
console.log(`Database check result: ${CHECK_DB}`);

const ELECTRICITY = await Deno.readTextFile('./cache/Electricity.csv');
const OUTPUT_JSON = './cache/electricity.json';

async function csvToJson() {
	// Read & parse CSV into objects
	const ELEC_ROWS = ELECTRICITY.split('\n');
	const DATA = [];
	const JSON_NESTED = {};

	for await (const ELEC_ROW of ELEC_ROWS) {
		// Expect columns named "Time", "Consumed", "Credited"
		const [TIME, CONSUMED, CREDITED] = ELEC_ROW.split(',');
		if (!TIME || isNaN(CONSUMED) || isNaN(CREDITED)) continue;

		const UTC = new Date(TIME);
		if (isNaN(UTC.getTime())) continue;
		const TIME_REFORMAT = formatDateTimeLocal(UTC);
		const YYYY = TIME_REFORMAT.YYYY;
		const MM = TIME_REFORMAT.MM;
		const DD = TIME_REFORMAT.DD;
		const hh = TIME_REFORMAT.hh;
		const mm = TIME_REFORMAT.mm;
		const ss = TIME_REFORMAT.ss;
		const ms = TIME_REFORMAT.ms;
		const TZH = TIME_REFORMAT.TZH;
		const TZM = TIME_REFORMAT.TZM;
		const LOCAL =
			`${YYYY}-${MM}-${DD}T${hh}:${mm}:${ss}.${ms}+${TZH}:${TZM}`;

		try {
			const document = {
				utcTimeStamp: UTC.valueOf(),
				utcDateTime: UTC,
				localDateTime: LOCAL,
				ElectricityConsume: Number(CONSUMED),
				ElectricityCredited: Number(
					CREDITED.replace(/(\r\n|\n|\r)/gm, ''),
				),
			};
			JSON_NESTED[YYYY] ??= {};
			JSON_NESTED[YYYY][MM] ??= {};
			JSON_NESTED[YYYY][MM][DD] ??= {};
			JSON_NESTED[YYYY][MM][DD][`${hh}:${mm}:${ss}.${ms}`] = document;
		} catch (error) {
			console.error(error);
		} finally {
			// No cleanup required in finally block
		}
	}

	// Wrap in an array as per spec
	const OUTPUT = [JSON_NESTED];
	// Write JSON output
	await Deno.writeTextFile(OUTPUT_JSON, JSON.stringify(OUTPUT, null, 2));
	console.log(`Wrote transformed data to ${OUTPUT_JSON}`);
}

csvToJson();
/**
const CONSUME = await Deno.readTextFile('./cache/Consumed-5min.csv');
const GENERATE = await Deno.readTextFile('./cache/Generated-5min.csv');

function csvToJson() {
	const CON_ROWS = CONSUME.split('\n');
	const GEN_ROWS = GENERATE.split('\n');
	const DIFF = Number(CON_ROWS.length) - Number(GEN_ROWS.length);
	const CON_HEADER = CON_ROWS[0].split(',');
	const JSON_DATA = [];
	const DATA = [];

	for (let iVal1 = 1; iVal1 < CON_ROWS.length - 1; iVal1++) {
		const CON_VAL = CON_ROWS[iVal1].split(',');
		let utcDetails;
		let addTime;
		for (let iVal2 = 0; iVal2 < CON_HEADER.length; iVal2++) {
			let conVal;
			let genVal;
			if (iVal2 === 0) {
				addTime = 0;
				utcDetails = timeDetails(CON_ROWS[iVal1].split(',')[0]);
			} else {
				if (iVal1 <= DIFF) {
					conVal = CON_VAL[iVal2].trim();
					genVal = '0';
					if (conVal === '') {
						conVal = '0';
					}
				} else {
					const GEN_VAL = GEN_ROWS[iVal1 - DIFF].split(',');
					conVal = CON_VAL[iVal2].trim();
					if (conVal === '') {
						conVal = '0';
					}
					genVal = GEN_VAL[iVal2].trim();
				}
				const NEW_DATE = new Date(utcDetails);
				const NEW_TIME = new Date(
					NEW_DATE.getTime() + addTime++ * 5 * 60 * 1000,
				);

				const OBJECT = {
					utcDateTime: NEW_TIME,
					utcTimeStamp: Number(NEW_TIME),
					localDateTime: NEW_TIME.toLocaleString(),
					powerCunsume: conVal,
					powerProduce: genVal,
				};
				DATA.push(OBJECT);
			}
		}
	}
	JSON_DATA.push({ data: DATA });
	return JSON_DATA;
}

function timeDetails(DATE) {
	const GET_DATE = DATE;
	const GET_YYYY = GET_DATE.substring(
		GET_DATE.indexOf('/', GET_DATE.indexOf('/') + 1) + 1,
		GET_DATE.length,
	);
	const GET_MM = GET_DATE.substring(
		GET_DATE.indexOf('/') + 1,
		GET_DATE.indexOf('/', GET_DATE.indexOf('/') + 1),
	);
	const GET_DD = GET_DATE.substring(0, GET_DATE.indexOf('/'));
	const GET_MY_DATE = new Date(`${GET_YYYY}-${GET_MM}-${GET_DD}`);
	const UTC_TIME = new Date(GET_MY_DATE.setHours(0, 0, 0, 0));
	return UTC_TIME.toISOString();
}

const RESULT = await csvToJson();
Deno.writeTextFile('./cache/powerInfo.json', JSON.stringify(RESULT));
**/
