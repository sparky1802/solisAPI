import { MongoClient } from 'npm:mongodb@6';
/**
import { BSON, EJSON, ObjectId } from "npm:bson@6"
const bytes = BSON.serialize({ _id: new ObjectId() });
//console.log(bytes);
//const doc = BSON.deserialize(bytes);
//console.log(EJSON.stringify(doc));
//const objobj = ObjectId("abc123")
**/

const BUFFER = JSON.parse(
	await Deno.readTextFile('./cache/2024-01-01-stationDay-2024-01-01.json'),
);
const DAYS = Object.keys(BUFFER).length;

const URL = 'mongodb://localhost:27017';
const CLIENT = new MongoClient(URL);
const DB_NAME = 'solarDB';
const COLL_NAME = 'consumedGenerated';

const CHECK_DB = await checkDb();
console.log(`Database check result: ${CHECK_DB}`);
if (CHECK_DB) {
	for (let iDays = 0; iDays < DAYS; iDays++) {
		let data = BUFFER[iDays].data;
		if (data !== null) {
			let itemCount = data.length;
			for (let iItems = 0; iItems < itemCount; iItems++) {
				let consumeEnergy = data[iItems].consumeEnergy;
				let produceEnergy = data[iItems].produceEnergy;
				let solisTime = data[iItems].time;
				let solitTimeZone = data[iItems].timeZone;
				let localTimeZone = new Date(solisTime).getTimezoneOffset() /
					-60;
				let solisTimeZone = (localTimeZone - solitTimeZone) * 1000 *
					60 * 60;
				let utcEpocTime = solisTime - solisTimeZone;
				let utc = new Date(utcEpocTime);
				let localDate = utc.toLocaleString('en-AU');
				let YYYY = localDate.substring(
					localDate.indexOf('/', localDate.indexOf('/') + 1) + 1,
					localDate.indexOf(','),
				);
				let MM = localDate.substring(
					localDate.indexOf('/') + 1,
					localDate.indexOf('/', localDate.indexOf('/') + 1),
				);
				let DD = localDate.substring(0, localDate.indexOf('/'));
				let localTime = utc.toTimeString();
				let hh = localTime.substring(0, localTime.indexOf(':'));
				let mm = localTime.substring(
					localTime.indexOf(':') + 1,
					localTime.indexOf(':', localTime.indexOf(':') + 1),
				);
				let ss = localTime.substring(
					localTime.indexOf(':', localTime.indexOf(':') + 1) + 1,
					localTime.indexOf(' '),
				);
				let tzh = Math.floor(utc.getTimezoneOffset() / -60);
				let tzm = ((utc.getTimezoneOffset() / -60 -
					Math.floor(utc.getTimezoneOffset() / -60)) * 60)
					.toString().padStart(2, '0');
				let localDateTime =
					`${YYYY}-${MM}-${DD}T${hh}:${mm}:${ss}.000+${tzh}:${tzm}`;

				try {
					await CLIENT.connect();
					const DB = CLIENT.db(DB_NAME);
					const COLL = DB.collection(COLL_NAME);
					const DOC_EXIST = await COLL.findOne({
						timeId: utc.valueOf(),
					});
					const document = {
						utcTimeStamp: utc.valueOf(),
						utcYear: Number(utc.toISOString().substring(0, 4)),
						utcDateTime: utc,
						localDateTime: localDateTime,
						SolarCunsume: consumeEnergy,
						SolarProduce: produceEnergy,
					};
					if (!DOC_EXIST) {
						await COLL.insertOne(document);
					}
				} catch (error) {
					console.error(error);
				} finally {
				}
			}
		}
	}
}
CLIENT.close();

async function checkDb() {
	try {
		await CLIENT.connect();

		// List all databases
		const ADMIN_DB = CLIENT.db().admin();
		const DB_LIST = await ADMIN_DB.listDatabases();
		const DB_EXIST = DB_LIST.databases.some((db) => db.name === DB_NAME);
		let dbName = CLIENT.db(DB_NAME);

		if (!DB_EXIST) {
			// Create the database
			dbName = CLIENT.db(DB_NAME);
		}
		// List all Collections
		const COLL_LIST = await dbName.listCollections().toArray();
		const COLL_EXIST = COLL_LIST.some((coll) => coll.name === COLL_NAME);
		if (!COLL_EXIST) {
			//Create the collection
			await dbName.createCollection(COLL_NAME, {
				timeseries: {
					timeField: 'utcDateTime',
					metaField: 'utcYear',
					bucketMaxSpanSeconds: 86400,
					bucketRoundingSeconds: 86400,
				},
			});
			return true;
		}
		return true;
	} catch (error) {
		return error;
	} finally {
		await CLIENT.close();
	}
}
