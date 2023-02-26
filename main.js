'use strict';

// doc links:
// https://www.msxfaq.de/sonst/iot/kostal15.htm
// https://github.com/sla89/hassio-kostal-piko/blob/main/docs/api.yaml

// The adapter-core module gives you access to the core ioBroker functions, you need to create an adapter
const utils = require('@iobroker/adapter-core');

// Load your modules here, e.g.:
// const schedule = require('node-schedule');
const adapterIntervals = {};

// state
const ID_OperatingState               = 16780032;  // 0 = aus; 1 = Leerlauf(?); 2 = Anfahren, DC Spannung noch zu klein(?)
                                                   // 3 = Einspeisen(MPP); 4 = Einspeisen(abgeregelt)
const ID_InverterType                 = 16780544;  // - Inverter type
const ID_InfoUIVersion                = 16779267;  // - Info version
const ID_InverterName                 = 16777984;  // - Inverter name
// statistics - daily
const ID_StatDay_Yield                = 251658754; // in Wh  -  Total yield this operational day
const ID_StatDay_HouseConsumption     = 251659010; // in Wh
const ID_StatDay_SelfConsumption      = 251659266; // in Wh
const ID_StatDay_SelfConsumptionRate  = 251659278; // in %
const ID_StatDay_Autarky              = 251659279; // in %
// statistics - total
const ID_StatTot_OperatingTime        = 251658496; // in h   -  Total operating time of inverter
const ID_StatTot_Yield                = 251658753; // in kWh -  Total yield in inverter life time
const ID_StatTot_HouseConsumption     = 251659009; // in kWh
const ID_StatTot_SelfConsumption      = 251659265; // in kWh
const ID_StatTot_SelfConsumptionRate  = 251659280; // in %
const ID_StatTot_Autarky              = 251659281; // in %
// live values - PV generator power
const ID_Power_SolarDC                = 33556736;  // in W  -  DC Power PV generator in total
const ID_Power_DC1Current             = 33555201;  // in A  -  DC current line 1
const ID_Power_DC1Voltage             = 33555202;  // in V  -  DC voltage line 1
const ID_Power_DC1Power               = 33555203;  // in W  -  DC power line 1 
const ID_Power_DC2Current             = 33555457;  // in A  -  DC current line 2
const ID_Power_DC2Voltage             = 33555458;  // in V  -  DC voltage line 2
const ID_Power_DC2Power               = 33555459;  // in W  -  DC power line 2
const ID_Power_DC3Current             = 33555713;  // in A  -  DC current line 3 (equals to battery current in case of Pico BA)
const ID_Power_DC3Voltage             = 33555714;  // in V  -  DC voltage line 3 (equals to battery voltage in case of Pico BA)
const ID_Power_DC3Power               = 33555715;  // in W  -  DC power line 3 (equals to battery power in case of Pico BA)
// live values - home
const ID_Power_HouseConsumptionSolar  = 83886336;  // in W  -  Act Home Consumption Solar - not implemented
const ID_Power_HouseConsumptionBat    = 83886592;  // in W  -  Act Home Consumption Bat - not implemented
const ID_Power_HouseConsumptionGrid   = 83886848;  // in W  -  Act Home Consumption Grid - not implemented
const ID_Power_HouseConsumptionPhase1 = 83887106;  // in W  -  Act Home Consumption Phase 1
const ID_Power_HouseConsumptionPhase2 = 83887362;  // in W  -  Act Home Consumption Phase 2
const ID_Power_HouseConsumptionPhase3 = 83887618;  // in W  -  Act Home Consumption Phase 3
const ID_Power_HouseConsumption       = 83887872;  // in W  -  Consumption of your home, measured by PIKO sensor
const ID_Power_SelfConsumption        = 83888128;  // in W  -  Self Consumption
// live values power output
const ID_Power_GridAC                 = 67109120;  // in W  -  GridOutputPower excluding power for battery charging
// live values - grid parameter
const ID_GridLimitation               = 67110144;  // in %   -  Grid Limitation
const ID_GridFrequency                = 67110400;  // in Hz  -  Grid Frequency - not implemented
const ID_GridCosPhi                   = 67110656;  //        -  Grid CosPhi - not implemented
// live values - grid phase 1
const ID_L1GridCurrent                = 67109377;  // in A  -  Grid Output Current Phase 1 
const ID_L1GridVoltage                = 67109378;  // in V  -  Grid Output Voltage Phase 1
const ID_L1GridPower                  = 67109379;  // in W  -  Grid Output Power Phase 1
// live values - grid phase 2
const ID_L2GridCurrent                = 67109633;  // in A  -  Grid Output Current Phase 2
const ID_L2GridVoltage                = 67109634;  // in V  -  Grid Output Voltage Phase 2
const ID_L2GridPower                  = 67109635;  // in W  -  Grid Output Power Phase 2
// live values - grid phase 3
const ID_L3GridCurrent                = 67109889;  // in A  -  Grid Output Current Phase 3
const ID_L3GridVoltage                = 67109890;  // in V  -  Grid Output Voltage Phase 3
const ID_L3GridPower                  = 67109891;  // in W  -  Grid Output Power Phase 3
// live values - Battery
const ID_BatVoltage                   = 33556226;  // in V
const ID_BatTemperature               = 33556227;  // in °C
const ID_BatChargeCycles              = 33556228;  // in 1
const ID_BatStateOfCharge             = 33556229;  // in %
const ID_BatCurrentDir                = 33556230;  // 1 = discharge; 0 = charge
const ID_BatCurrent                   = 33556238;  // in A
// live values - inputs
const ID_InputAnalog1                 = 167772417; // in V   -  10bit resolution
const ID_InputAnalog2                 = 167772673; // in V   -  10bit resolution
const ID_InputAnalog3                 = 167772929; // in V   -  10bit resolution
const ID_InputAnalog4                 = 167773185; // in V   -  10bit resolution
const ID_Input_S0_count               = 184549632; // in 1   -  not implemented
const ID_Input_S0_seconds             = 150995968; // in sec -  not implemented


var InverterType = 'unknown';       // Inverter type
var InverterAPIPiko = false;        // Inverter API of Piko or Piko BA inverters; Kostal Piko 6.0BA, 8.0BA, 10.0BA, 3.0, 5.5, 7.0, 10, 12, 15, 17, 20
var InverterAPIPikoMP = false;      // Inverter API of Piko MP inverters; Kostal PIKO 3.0-1 MP plus
var InverterUIVersion  = 'unknown'; // Inverter UI Version
var KostalRequestOnce  = '';        // IP request-string for one time request of system type etc.
var KostalRequest1     = '';        // IP request-string 1 for PicoBA current data
var KostalRequest2     = '';        // IP request-string 2 for PicoBA current data
var KostalRequestDay   = '';        // IP request-string for PicoBA daily statistics
var KostalRequestTotal = '';        // IP request-string for PicoBA total statistics


function resolveAfterXSeconds(x) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(x);
        }, (x * 1000) );
    });
}


class KostalPikoBA extends utils.Adapter {

    /****************************************************************************************
    * @param {Partial<utils.AdapterOptions>} [options={}]
    */
    constructor(options) {
        super({
            ...options,
            name: 'kostal-piko-ba'
        });
        this.on('ready', this.onReady.bind(this));
        // this.on('objectChange', this.onObjectChange.bind(this));
        // this.on('stateChange', this.onStateChange.bind(this));
        // this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }


    /****************************************************************************************
    * Is called when databases are connected and adapter received configuration. ***********/
    async onReady() {
        if (!this.config.ipaddress) {
            this.log.error(`Kostal Piko IP address not set`);
        } else {
            this.log.info(`IP address found in config: ${this.config.ipaddress}`);
            // Validate IP address ...
            if (!(/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(this.config.ipaddress))) {
                this.log.error(`You have entered an invalid IP address! ${this.config.ipaddress}`)
            }
        }

        if (this.config.ipaddress) { // get general info of connected inverter
            KostalRequestOnce = `http://${this.config.ipaddress}/api/dxs.json`
                + `?dxsEntries=${ID_InverterType}&dxsEntries=${ID_InfoUIVersion}&dxsEntries=${ID_InverterName}`;
            await this.ReadPikoOnce();
            await resolveAfterXSeconds(5);
            this.log.debug(`Initial read of general info for inverter IP ${this.config.ipaddress} done`);
            if (!InverterAPIPiko && !InverterAPIPikoMP) { // no inverter type detected
                this.log.error(`Error in in detecting Kostal inverter`);
                this.log.info(`Stopping adapter`);
                this.stop;
            }
        }

        if (!this.config.polltimelive) {
            this.config.polltimelive = 10000;
            this.log.warn(`Polltime not set or zero - will be set to ${(this.config.polltimelive / 1000)} seconds`);
        } 
        if (this.config.polltimelive < 5000) {
            this.config.polltimelive = 5000;
            this.log.warn(`Polltime has to be minimum 5000 will be set to ${(this.config.polltimelive / 1000)} seconds`);
        }
        this.log.info(`Polltime set to: ${(this.config.polltimelive / 1000)} seconds`);

        if (!this.config.polltimedaily) {
            this.config.polltimedaily = 60000;
            this.log.warn(`Polltime daily statistics data not set or zero - will be set to ${(this.config.polltimedaily / 1000)} seconds`);
        }
        if (this.config.polltimedaily < (this.config.polltimelive * 2) ) {
            this.config.polltimedaily = (this.config.polltimelive * 2);
            this.log.warn(`Polltime daily statistics should be min. double of standard poll - will be set to ${(this.config.polltimedaily / 1000)} seconds`);
        }
        this.log.info(`Polltime daily statistics set to: ${(this.config.polltimedaily / 1000)} seconds`);

        if (!this.config.polltimetotal) {
            this.config.polltimetotal = 200000;
            this.log.warn(`Polltime alltime statistics not set or zero - will be set to ${(this.config.polltimetotal / 1000)} seconds`);
        }
        if (this.config.polltimetotal < (this.config.polltimedaily * 2) ) {
            this.config.polltimetotal = (this.config.polltimedaily * 2);
            this.log.warn(`Polltime alltime statistics should be min. double of daily poll - will be set to ${(this.config.polltimetotal / 1000)} seconds`);
        }
        this.log.info(`Polltime alltime statistics set to: ${(this.config.polltimetotal / 1000)} seconds`);


        //sentry.io ping
        if (this.supportsFeature && this.supportsFeature('PLUGINS')) {
            const sentryInstance = this.getPluginInstance('sentry');
            const today = new Date();
            var last = await this.getStateAsync('LastSentryLogDay')
            if (last?.val != today.getDate()) {
                if (sentryInstance) {
                    const Sentry = sentryInstance.getSentryObject();
                    Sentry && Sentry.withScope(scope => {
                        scope.setLevel('info');
                        scope.setTag('SentryDay', today.getDate());
                        scope.setTag('Inverter', this.config.ipaddress);
                        scope.setTag('Inverter-Type', InverterType);
                        scope.setTag('Inverter-UI', InverterUIVersion);
                        Sentry.captureMessage('Adapter kostal-piko-ba started', 'info'); // Level "info"
                    });
                }
                this.setStateAsync('LastSentryLogDay', { val: today.getDate(), ack: true });
            }
        }

        // this.subscribeStates('*'); // all state changes inside the adapters namespace are subscribed

        if (this.config.ipaddress) {
            KostalRequest1 = `http://${this.config.ipaddress}/api/dxs.json`
                + `?dxsEntries=${ID_Power_SolarDC        }&dxsEntries=${ID_Power_GridAC          }`
                + `&dxsEntries=${ID_Power_DC1Power       }&dxsEntries=${ID_Power_DC1Current      }`
                + `&dxsEntries=${ID_Power_DC1Voltage     }&dxsEntries=${ID_Power_DC2Power        }`
                + `&dxsEntries=${ID_Power_DC2Current     }&dxsEntries=${ID_Power_DC2Voltage      }`
                + `&dxsEntries=${ID_Power_DC3Power       }&dxsEntries=${ID_Power_DC3Current      }`
                + `&dxsEntries=${ID_Power_DC3Voltage     }`            
                + `&dxsEntries=${ID_Power_SelfConsumption}&dxsEntries=${ID_Power_HouseConsumption}`
                + `&dxsEntries=${ID_OperatingState       }&dxsEntries=${ID_BatVoltage            }`
                + `&dxsEntries=${ID_BatTemperature       }&dxsEntries=${ID_BatStateOfCharge      }`
                + `&dxsEntries=${ID_BatCurrent           }&dxsEntries=${ID_BatCurrentDir         }`
                + `&dxsEntries=${ID_GridLimitation       }`;

            KostalRequest2 = `http://${this.config.ipaddress}/api/dxs.json`
                + `?dxsEntries=${ID_L1GridCurrent                }&dxsEntries=${ID_L1GridVoltage                }`
                + `&dxsEntries=${ID_L1GridPower                  }&dxsEntries=${ID_L2GridCurrent                }`
                + `&dxsEntries=${ID_L2GridVoltage                }&dxsEntries=${ID_L2GridPower                  }`
                + `&dxsEntries=${ID_L3GridCurrent                }&dxsEntries=${ID_L3GridVoltage                }`
                + `&dxsEntries=${ID_L3GridPower                  }&dxsEntries=${ID_Power_HouseConsumptionPhase1 }`
                + `&dxsEntries=${ID_Power_HouseConsumptionPhase2 }&dxsEntries=${ID_Power_HouseConsumptionPhase3 }`;
            if (this.config.readanalogs) {
                KostalRequest2 = KostalRequest2 + `&dxsEntries=${ID_InputAnalog1 }&dxsEntries=${ID_InputAnalog2 }`
                                                + `&dxsEntries=${ID_InputAnalog3 }&dxsEntries=${ID_InputAnalog4 }`;

                if ((this.config.normAn1Max != 10) || (this.config.normAn1Min != 0)) {
                    this.extendObject('Inputs.Analog1', { common: { unit: '' } });
                }
                if ((this.config.normAn2Max != 10) || (this.config.normAn2Min != 0)) {
                    this.extendObject('Inputs.Analog2', { common: { unit: '' } });
                }
                if ((this.config.normAn3Max != 10) || (this.config.normAn3Min != 0)) {
                    this.extendObject('Inputs.Analog3', { common: { unit: '' } });
                }
                if ((this.config.normAn4Max != 10) || (this.config.normAn4Min != 0)) {
                    this.extendObject('Inputs.Analog4', { common: { unit: '' } });
                }

            }

            KostalRequestDay = `http://${this.config.ipaddress}/api/dxs.json`
                + `?dxsEntries=${ID_StatDay_SelfConsumption}&dxsEntries=${ID_StatDay_SelfConsumptionRate}`
                + `&dxsEntries=${ID_StatDay_Yield          }&dxsEntries=${ID_StatDay_HouseConsumption   }`
                + `&dxsEntries=${ID_StatDay_Autarky        }`;

            KostalRequestTotal = `http://${this.config.ipaddress}/api/dxs.json`
                + `?dxsEntries=${ID_StatTot_SelfConsumption}&dxsEntries=${ID_StatTot_SelfConsumptionRate}`
                + `&dxsEntries=${ID_StatTot_Yield          }&dxsEntries=${ID_StatTot_HouseConsumption   }`
                + `&dxsEntries=${ID_StatTot_Autarky        }&dxsEntries=${ID_StatTot_OperatingTime      }`;
            if (this.config.readbattery) {
                KostalRequestTotal = KostalRequestTotal + `&dxsEntries=${ID_BatChargeCycles}`;
            }

            this.log.debug(`OnReady done`);
            await this.ReadPikoTotal();
            await resolveAfterXSeconds(3);
            await this.ReadPikoDaily();
            await resolveAfterXSeconds(3);
            await this.Scheduler();
            this.log.debug(`Initial ReadPiko done`);
        } else {
            this.stop;
        }
    }


    /****************************************************************************************
    * Is called when adapter shuts down - callback has to be called under any circumstances!
    * @param {() => void} callback */
    onUnload(callback) {
        try {
            clearTimeout(adapterIntervals.live);
            clearTimeout(adapterIntervals.daily);
            clearTimeout(adapterIntervals.total);
            Object.keys(adapterIntervals).forEach(interval => clearInterval(adapterIntervals[interval]));
            this.log.info(`Adapter Kostal-Piko-BA cleaned up everything...`);
            callback();
        } catch (e) {
            callback();
        } // END try catch
    }


    /****************************************************************************************
    * Scheduler ****************************************************************************/
    Scheduler() {
        this.ReadPiko();
        this.ReadPiko2();
        try {
            clearTimeout(adapterIntervals.live);
            adapterIntervals.live = setTimeout(this.Scheduler.bind(this), this.config.polltimelive);
        } catch (e) {
            this.log.error(`Error in setting adapter schedule: ${e}`);
            this.restart;
        } // END try catch
    }


    /****************************************************************************************
  * ReadPikoOnce ***************************************************************************/
    async ReadPikoOnce() {
        const axios = require('axios');
        const xml2js = require('xml2js');

        // @ts-ignore axios.get is valid
        await axios.get(KostalRequestOnce, { transformResponse: (r) => r })
            .then(response => {   //.status == 200
                // access parsed JSON response data using response.data field
                this.log.debug(`Piko-BA general info updated - Kostal response data: ${response.data}`);
                var result = JSON.parse(response.data).dxsEntries;
                InverterType = result[0].value;
                this.setStateAsync('Info.InverterType', { val: InverterType, ack: true });
                InverterAPIPiko = true;
                InverterUIVersion = result[1].value;
                this.setStateAsync('Info.InverterUIVersion', { val: InverterUIVersion, ack: true });
                this.setStateAsync('Info.InverterName', { val: result[2].value, ack: true });
            })
            .catch(error => {
                if (error.response) { //get HTTP error code
                    if (error.response == 404) {
                        this.log.error(`HTTP error 404 when calling Piko(-BA) API for general info: ${error.response.status}`);
                    }
                this.log.error(`HTTP error when calling Piko(-BA) API for general info: ${error.response.status}`);
                } else {
                    this.log.error(`Unknown error when calling Piko(-BA) API for general info: ${error.message}`);
                    this.log.error(`Please verify IP address: ${this.config.ipaddress} !! (e0)`);
                    if (this.supportsFeature && this.supportsFeature('PLUGINS')) {
                        const sentryInstance = this.getPluginInstance('sentry');
                        if (sentryInstance) {
                            const Sentry = sentryInstance.getSentryObject();
                            Sentry && Sentry.withScope(scope => {
                                scope.setTag('Inverter', this.config.ipaddress);
                                scope.setTag('Inverter-Type', InverterType);
                                scope.setTag('Inverter-UI', InverterUIVersion);
                                Sentry.captureException(error.message);
                            });
                        }
                    }
                }
            }) // END catch

        await resolveAfterXSeconds(2);

        if (InverterAPIPiko) { // no inverter type detected yet
            this.log.info(`Detected inverter type: ${InverterType}`);
        } else {
            this.log.warn(`Error in polling with Piko(-BA)-API: ${InverterType}`);
            this.log.info(`Trying to find inverter with Piko-MP-API`);
        }

        if (!InverterAPIPiko) { // no inverter type detected yet -> try to detect Piko MP Inverter
            // @ts-ignore axios.get is valid
            axios.get(`http://${this.config.ipaddress}/versions.xml`, { transformResponse: (r) => r })
                .then((response) => {
                    xml2js.parseString(response.data, (err, result) => {
                        if (err) {
                            this.log.error(`Error when calling Piko MP API with axios for general info: ${err}`);
                        } else {
                            const MPType = result.root.Device[0].$.Name;
                            if (MPType) {
                                this.log.info(`Discovered Piko MP API, type of inverter: ${MPType}`);
                                InverterType = MPType;
                                this.setStateAsync('Info.InverterType', { val: InverterType, ack: true });
                                InverterAPIPikoMP = true;
                                this.setStateAsync('Info.InverterName', { val: result.root.Device[0].$.NetBiosName, ack: true });
                                this.log.error(`Piko MP API not supported yet!!!!`);
                            }
                        }
                    });
                })
                .catch((error) => {
                    this.log.error(`Error when calling Piko MP API with axios for general info: ${error}`);
                });
        }

    } // END ReadPikoOnce
   

    /****************************************************************************************
    * ReadPiko *****************************************************************************/
    ReadPiko() {
        const axios = require('axios');

        /*TEST
        var got = require('got');
        (async () => {
            try {
                // @ts-ignore got is valid
                var response = await got(KostalRequest1);
                if (!response.error && response.statusCode == 200) {
                    this.log.debug(`Piko-BA live data 1 update - Kostal response data: ${response.body}`);
                    var result = await JSON.parse(response.body).dxsEntries;
                    this.setStateAsync('Power.SolarDC', { val: Math.round(result[0].value), ack: true });
                    this.setStateAsync('Power.GridAC', { val: Math.round(result[1].value), ack: true });
                    this.setStateAsync('Power.DC1Power', { val: Math.round(result[2].value), ack: true });
                    this.setStateAsync('Power.DC1Current', { val: (Math.round(1000 * result[3].value)) / 1000, ack: true });
                    this.setStateAsync('Power.DC1Voltage', { val: Math.round(result[4].value), ack: true });
                    if (result[7].value) {
                        this.setStateAsync('Power.DC2Power', { val: Math.round(result[5].value), ack: true });
                        this.setStateAsync('Power.DC2Current', { val: (Math.round(1000 * result[6].value)) / 1000, ack: true });
                        this.setStateAsync('Power.DC2Voltage', { val: Math.round(result[7].value), ack: true });
                    }
                    if (result[10].value) {
                        this.setStateAsync('Power.DC3Power', { val: Math.round(result[8].value), ack: true });
                        this.setStateAsync('Power.DC3Current', { val: (Math.round(1000 * result[9].value)) / 1000, ack: true });
                        this.setStateAsync('Power.DC3Voltage', { val: Math.round(result[10].value), ack: true });
                    }
                    this.setStateAsync('Power.SelfConsumption', { val: Math.round(result[11].value), ack: true });
                    this.setStateAsync('Power.HouseConsumption', { val: Math.floor(result[12].value), ack: true });
                    this.setStateAsync('State', { val: result[13].value, ack: true });
                    switch (result[13].value) {
                        case 0:
                            this.setStateAsync('StateAsString', { val: 'OFF', ack: true });
                            break;
                        case 1:
                            this.setStateAsync('StateAsString', { val: 'Idling', ack: true });
                            break;
                        case 2:
                            this.setStateAsync('StateAsString', { val: 'Start up, DC voltage still too low for feed-in', ack: true });
                            break;
                        case 3:
                            this.setStateAsync('StateAsString', { val: 'Feeding (MPP)', ack: true });
                            break;
                        case 4:
                            this.setStateAsync('StateAsString', { val: 'Feeding (limited)', ack: true });
                            break;
                        default:
                            this.setStateAsync('StateAsString', { val: 'Undefined', ack: true });
                    }
                    if (result[14].value) {
                        this.setStateAsync('Battery.Voltage', { val: Math.round(result[14].value), ack: true });
                        this.setStateAsync('Battery.Temperature', { val: (Math.round(10 * result[15].value)) / 10, ack: true });
                        this.setStateAsync('Battery.SoC', { val: result[16].value, ack: true });
                        if (result[18].value) { // result[18] = 'Battery current direction; 1=Load; 0=Unload'
                            this.setStateAsync('Battery.Current', { val: result[17].value, ack: true });
                        }
                        else { // discharge
                            this.setStateAsync('Battery.Current', { val: result[17].value * -1, ack: true });
                        }
                    }
                    this.setStateAsync('Power.Surplus', { val: Math.round(result[1].value - result[11].value), ack: true });
                    if (result.length >= 20) { // not existent for Piko3.0 or if no limitation defined!?!?!
                        this.setStateAsync('GridLimitation', { val: result[19].value, ack: true });
                    } else {
                        this.setStateAsync('GridLimitation', { val: 100, ack: true });
                    }
                }
                else {
                    this.log.error(`Error: ${response.error} by polling Kostal Piko-BA: ${KostalRequest1}`);
                }
            } catch (e) {
                this.log.error(`Error in calling Kostal Piko API: ${e}`);
                this.log.error(`Please verify IP address: ${this.config.ipaddress} !! (e1)`);
                if (this.supportsFeature && this.supportsFeature('PLUGINS')) {
                    const sentryInstance = this.getPluginInstance('sentry');
                    if (sentryInstance) {
                        const Sentry = sentryInstance.getSentryObject();
                        Sentry && Sentry.withScope(scope => {
                            scope.setTag('Inverter', this.config.ipaddress);
                            scope.setTag('Inverter-Type', InverterType);
                            scope.setTag('Inverter-UI', InverterUIVersion);
                            Sentry.captureException(e);
                        });
                    }
                }
            } // END try catch
        })();
        TEST */

        if (InverterAPIPiko) {  // code for Piko(-BA)
            // @ts-ignore axios.get is valid
            axios.get(KostalRequest1, { transformResponse: (r) => r })
                .then(response => {   //.status == 200
                    // access parsed JSON response data using response.data field
                    this.log.debug(`Piko-BA live data 1 update - Kostal response data: ${response.data}`);
                    var result = JSON.parse(response.data).dxsEntries;
                    this.setStateAsync('Power.SolarDC', { val: Math.round(result[0].value), ack: true });
                    this.setStateAsync('Power.GridAC', { val: Math.round(result[1].value), ack: true });
                    this.setStateAsync('Power.DC1Power', { val: Math.round(result[2].value), ack: true });
                    this.setStateAsync('Power.DC1Current', { val: (Math.round(1000 * result[3].value)) / 1000, ack: true });
                    this.setStateAsync('Power.DC1Voltage', { val: Math.round(result[4].value), ack: true });
                    if (result[7].value) {
                        this.setStateAsync('Power.DC2Power', { val: Math.round(result[5].value), ack: true });
                        this.setStateAsync('Power.DC2Current', { val: (Math.round(1000 * result[6].value)) / 1000, ack: true });
                        this.setStateAsync('Power.DC2Voltage', { val: Math.round(result[7].value), ack: true });
                    }
                    if (result[10].value) {
                        this.setStateAsync('Power.DC3Power', { val: Math.round(result[8].value), ack: true });
                        this.setStateAsync('Power.DC3Current', { val: (Math.round(1000 * result[9].value)) / 1000, ack: true });
                        this.setStateAsync('Power.DC3Voltage', { val: Math.round(result[10].value), ack: true });
                    }
                    this.setStateAsync('Power.SelfConsumption', { val: Math.round(result[11].value), ack: true });
                    this.setStateAsync('Power.HouseConsumption', { val: Math.floor(result[12].value), ack: true });
                    this.setStateAsync('State', { val: result[13].value, ack: true });
                    switch (result[13].value) {
                        case 0:
                            this.setStateAsync('StateAsString', { val: 'OFF', ack: true });
                            break;
                        case 1:
                            this.setStateAsync('StateAsString', { val: 'Idling', ack: true });
                            break;
                        case 2:
                            this.setStateAsync('StateAsString', { val: 'Start up, DC voltage still too low for feed-in', ack: true });
                            break;
                        case 3:
                            this.setStateAsync('StateAsString', { val: 'Feeding (MPP)', ack: true });
                            break;
                        case 4:
                            this.setStateAsync('StateAsString', { val: 'Feeding (limited)', ack: true });
                            break;
                        default:
                            this.setStateAsync('StateAsString', { val: 'Undefined', ack: true });
                    }
                    if (result[14].value) {
                        this.setStateAsync('Battery.Voltage', { val: Math.round(result[14].value), ack: true });
                        this.setStateAsync('Battery.Temperature', { val: (Math.round(10 * result[15].value)) / 10, ack: true });
                        this.setStateAsync('Battery.SoC', { val: result[16].value, ack: true });
                        if (result[18].value) { // result[18] = 'Battery current direction; 1=Load; 0=Unload'
                            this.setStateAsync('Battery.Current', { val: result[17].value, ack: true });
                        }
                        else { // discharge
                            this.setStateAsync('Battery.Current', { val: result[17].value * -1, ack: true });
                        }
                    }
                    this.setStateAsync('Power.Surplus', { val: Math.round(result[1].value - result[11].value), ack: true });
                    if (result.length >= 20) { // not existent for Piko3.0 or if no limitation defined!?!?!
                        this.setStateAsync('GridLimitation', { val: result[19].value, ack: true });
                    } else {
                        this.setStateAsync('GridLimitation', { val: 100, ack: true });
                    }
                })
                .catch(error => {
                    if (error.response) { //get HTTP error code
                        if (error.response == 404) {
                            this.log.error(`HTTP error 404 when polling Piko(-BA) API: ${error.response.status}`);
                        }
                        this.log.error(`HTTP error when polling Piko(-BA) API: ${error.response.status}`);
                    } else {
                        this.log.error(`Unknown error when polling Piko(-BA) API: ${error.message}`);
                        this.log.error(`Please verify IP address: ${this.config.ipaddress} !! (e1)`);
                        if (this.supportsFeature && this.supportsFeature('PLUGINS')) {
                            const sentryInstance = this.getPluginInstance('sentry');
                            if (sentryInstance) {
                                const Sentry = sentryInstance.getSentryObject();
                                Sentry && Sentry.withScope(scope => {
                                    scope.setTag('Inverter', this.config.ipaddress);
                                    scope.setTag('Inverter-Type', InverterType);
                                    scope.setTag('Inverter-UI', InverterUIVersion);
                                    Sentry.captureException(error.message);
                                });
                            }
                        }
                    }
                }) // END catch
        } // END InverterAPIPiko

        if (InverterAPIPikoMP) { // code for Piko MP
            // missing code 
        } // END InverterAPIPikoMP

    } // END ReadPiko



    /****************************************************************************************
    * ReadPiko2 ****************************************************************************/
    ReadPiko2() {
        const axios = require('axios');

        /*TEST

        var got = require('got');
        (async () => {
            try {
                // @ts-ignore got is valid
                var response = await got(KostalRequest2);
                if (!response.error && response.statusCode == 200) {
                    this.log.debug(`Piko-BA live data 2 update - Kostal response data: ${response.body}`);
                    var result = await JSON.parse(response.body).dxsEntries;
                    this.setStateAsync('Power.AC1Current', { val: (Math.round(1000 * result[0].value)) / 1000, ack: true });
                    this.setStateAsync('Power.AC1Voltage', { val: Math.round(result[1].value), ack: true });
                    this.setStateAsync('Power.AC1Power', { val: Math.round(result[2].value), ack: true });
                    if (result[4].value) {
                        this.setStateAsync('Power.AC2Current', { val: (Math.round(1000 * result[3].value)) / 1000, ack: true });
                        this.setStateAsync('Power.AC2Voltage', { val: Math.round(result[4].value), ack: true });
                        this.setStateAsync('Power.AC2Power', { val: Math.round(result[5].value), ack: true });
                    }
                    if (result[7].value) {
                        this.setStateAsync('Power.AC3Current', { val: (Math.round(1000 * result[6].value)) / 1000, ack: true });
                        this.setStateAsync('Power.AC3Voltage', { val: Math.round(result[7].value), ack: true });
                        this.setStateAsync('Power.AC3Power', { val: Math.round(result[8].value), ack: true });
                    }
                    if (result[9].value) {
                        this.setStateAsync('Power.HouseConsumptionPhase1', { val: Math.round(result[9].value), ack: true });
                        this.setStateAsync('Power.HouseConsumptionPhase2', { val: Math.round(result[10].value), ack: true });
                        this.setStateAsync('Power.HouseConsumptionPhase3', { val: Math.round(result[11].value), ack: true });
                    }
                    if (this.config.readanalogs) {
                        this.setStateAsync('Inputs.Analog1', {
                            val: (Math.round(100 *
                             (result[12].value / 10 * (this.config.normAn1Max - this.config.normAn1Min) + this.config.normAn1Min)
                            )) / 100,
                            ack: true
                        });
                        this.setStateAsync('Inputs.Analog2', {
                            val: (Math.round(100 *
                                (result[13].value / 10 * (this.config.normAn2Max - this.config.normAn2Min) + this.config.normAn2Min)
                            )) / 100,
                            ack: true
                        });
                        this.setStateAsync('Inputs.Analog3', {
                            val: (Math.round(100 *
                                (result[14].value / 10 * (this.config.normAn3Max - this.config.normAn3Min) + this.config.normAn3Min)
                            )) / 100,
                            ack: true
                        });
                        this.setStateAsync('Inputs.Analog4', {
                            val: (Math.round(100 *
                                (result[15].value / 10 * (this.config.normAn4Max - this.config.normAn4Min) + this.config.normAn4Min)
                            )) / 100,
                            ack: true
                        });
                    }
                }
                else {
                    this.log.error(`Error: ${response.error} by polling Kostal Piko-BA: ${KostalRequest2}`);
                }
            } catch (e) {
                this.log.error(`Error in calling Kostal Piko API: ${e}`);
                this.log.error(`Please verify IP address: ${this.config.ipaddress} !! (e2)`);
                if (this.supportsFeature && this.supportsFeature('PLUGINS')) {
                    const sentryInstance = this.getPluginInstance('sentry');
                    if (sentryInstance) {
                        const Sentry = sentryInstance.getSentryObject();
                        Sentry && Sentry.withScope(scope => {
                            scope.setTag('Inverter', this.config.ipaddress);
                            scope.setTag('Inverter-Type', InverterType);
                            scope.setTag('Inverter-UI', InverterUIVersion);
                            Sentry.captureException(e);
                        });
                    }
                }
            } // END try catch
        })();

        TEST */


        if (InverterAPIPiko) {  // code for Piko(-BA)
            // @ts-ignore axios.get is valid
            axios.get(KostalRequest2, { transformResponse: (r) => r })
                .then(response => {   //.status == 200
                    // access parsed JSON response data using response.data field
                    this.log.debug(`Piko-BA live data 2 update - Kostal response data: ${response.data}`);
                    var result = JSON.parse(response.data).dxsEntries;
                    this.setStateAsync('Power.AC1Current', { val: (Math.round(1000 * result[0].value)) / 1000, ack: true });
                    this.setStateAsync('Power.AC1Voltage', { val: Math.round(result[1].value), ack: true });
                    this.setStateAsync('Power.AC1Power', { val: Math.round(result[2].value), ack: true });
                    if (result[4].value) {
                        this.setStateAsync('Power.AC2Current', { val: (Math.round(1000 * result[3].value)) / 1000, ack: true });
                        this.setStateAsync('Power.AC2Voltage', { val: Math.round(result[4].value), ack: true });
                        this.setStateAsync('Power.AC2Power', { val: Math.round(result[5].value), ack: true });
                    }
                    if (result[7].value) {
                        this.setStateAsync('Power.AC3Current', { val: (Math.round(1000 * result[6].value)) / 1000, ack: true });
                        this.setStateAsync('Power.AC3Voltage', { val: Math.round(result[7].value), ack: true });
                        this.setStateAsync('Power.AC3Power', { val: Math.round(result[8].value), ack: true });
                    }
                    if (result[9].value) {
                        this.setStateAsync('Power.HouseConsumptionPhase1', { val: Math.round(result[9].value), ack: true });
                        this.setStateAsync('Power.HouseConsumptionPhase2', { val: Math.round(result[10].value), ack: true });
                        this.setStateAsync('Power.HouseConsumptionPhase3', { val: Math.round(result[11].value), ack: true });
                    }
                    if (this.config.readanalogs) {
                        this.setStateAsync('Inputs.Analog1', {
                            val: (Math.round(100 *
                                (result[12].value / 10 * (this.config.normAn1Max - this.config.normAn1Min) + this.config.normAn1Min)
                            )) / 100,
                            ack: true
                        });
                        this.setStateAsync('Inputs.Analog2', {
                            val: (Math.round(100 *
                                (result[13].value / 10 * (this.config.normAn2Max - this.config.normAn2Min) + this.config.normAn2Min)
                            )) / 100,
                            ack: true
                        });
                        this.setStateAsync('Inputs.Analog3', {
                            val: (Math.round(100 *
                                (result[14].value / 10 * (this.config.normAn3Max - this.config.normAn3Min) + this.config.normAn3Min)
                            )) / 100,
                            ack: true
                        });
                        this.setStateAsync('Inputs.Analog4', {
                            val: (Math.round(100 *
                                (result[15].value / 10 * (this.config.normAn4Max - this.config.normAn4Min) + this.config.normAn4Min)
                            )) / 100,
                            ack: true
                        });
                    }
                })
                .catch(error => {
                    if (error.response) { //get HTTP error code
                        if (error.response == 404) {
                            this.log.error(`HTTP error 404 when polling Piko(-BA) API: ${error.response.status}`);
                        }
                        this.log.error(`HTTP error when polling Piko(-BA) API: ${error.response.status}`);
                    } else {
                        this.log.error(`Unknown error when polling Piko(-BA) API: ${error.message}`);
                        this.log.error(`Please verify IP address: ${this.config.ipaddress} !! (e2)`);
                        if (this.supportsFeature && this.supportsFeature('PLUGINS')) {
                            const sentryInstance = this.getPluginInstance('sentry');
                            if (sentryInstance) {
                                const Sentry = sentryInstance.getSentryObject();
                                Sentry && Sentry.withScope(scope => {
                                    scope.setTag('Inverter', this.config.ipaddress);
                                    scope.setTag('Inverter-Type', InverterType);
                                    scope.setTag('Inverter-UI', InverterUIVersion);
                                    Sentry.captureException(error.message);
                                });
                            }
                        }
                    }
                }) // END catch
        } // END InverterAPIPiko

       if (InverterAPIPikoMP) { // code for Piko MP
            // missing code 
        } // END InverterAPIPikoMP

    } // END ReadPiko2


    /****************************************************************************************
    * ReadPikoDaily ************************************************************************/
    ReadPikoDaily() {
        const axios = require('axios');

        if (InverterAPIPiko) {  // code for Piko(-BA)
            // @ts-ignore axios.get is valid
            axios.get(KostalRequestDay, { transformResponse: (r) => r })
                .then(response => {   //.status == 200
                    // access parsed JSON response data using response.data field
                    this.log.debug(`Piko-BA daily statistics update - Kostal response data: ${response.data}`);
                    var result = JSON.parse(response.data).dxsEntries;
                    this.setStateAsync('Statistics_Daily.SelfConsumption', { val: Math.round(result[0].value) / 1000, ack: true });
                    this.setStateAsync('Statistics_Daily.SelfConsumptionRate', { val: Math.round(result[1].value), ack: true });
                    this.setStateAsync('Statistics_Daily.Yield', { val: Math.round(result[2].value) / 1000, ack: true });
                    this.setStateAsync('Statistics_Daily.HouseConsumption', { val: Math.round(result[3].value) / 1000, ack: true });
                    this.setStateAsync('Statistics_Daily.Autarky', { val: Math.round(result[4].value), ack: true });
                })
                .catch(error => {
                    if (error.response) { //get HTTP error code
                        if (error.response == 404) {
                            this.log.error(`HTTP error 404 when calling Piko(-BA) API for daily statistics: ${error.response.status}`);
                        }
                        this.log.error(`HTTP error when calling Piko(-BA) API for daily statistics: ${error.response.status}`);
                    } else {
                        this.log.error(`Unknown error when calling Piko(-BA) API for daily statistics: ${error.message}`);
                        this.log.error(`Please verify IP address: ${this.config.ipaddress} !! (e3)`);
                        if (this.supportsFeature && this.supportsFeature('PLUGINS')) {
                            const sentryInstance = this.getPluginInstance('sentry');
                            if (sentryInstance) {
                                const Sentry = sentryInstance.getSentryObject();
                                Sentry && Sentry.withScope(scope => {
                                    scope.setTag('Inverter', this.config.ipaddress);
                                    scope.setTag('Inverter-Type', InverterType);
                                    scope.setTag('Inverter-UI', InverterUIVersion);
                                    Sentry.captureException(error.message);
                                });
                            }
                        }
                    }
                }) // END catch
        } // END InverterAPIPiko

        if (InverterAPIPikoMP) { // code for Piko MP
            // missing code 
        } // END InverterAPIPikoMP

        try {
            clearTimeout(adapterIntervals.daily);
            adapterIntervals.daily = setTimeout(this.ReadPikoDaily.bind(this), this.config.polltimedaily);
        } catch (e) {
            this.log.error(`Error in setting adapter schedule for daily statistics: ${e}`);
        } // END try catch

    } // END ReadPikoDaily
 

    /****************************************************************************************
    * ReadPikoTotal ************************************************************************/
    ReadPikoTotal() {
        const axios = require('axios');

        if (InverterAPIPiko) {  // code for Piko(-BA)
            // @ts-ignore axios.get is valid
            axios.get(KostalRequestTotal, { transformResponse: (r) => r })
                .then(response => {   //.status == 200
                    // access parsed JSON response data using response.data field
                    this.log.debug(`Piko-BA lifetime statistics updated - Kostal response data: ${response.data}`);
                    var result = JSON.parse(response.data).dxsEntries;
                    this.setStateAsync('Statistics_Total.SelfConsumption', { val: Math.round(result[0].value), ack: true });
                    this.setStateAsync('Statistics_Total.SelfConsumptionRate', { val: Math.round(result[1].value), ack: true });
                    this.setStateAsync('Statistics_Total.Yield', { val: Math.round(result[2].value), ack: true });
                    this.setStateAsync('Statistics_Total.HouseConsumption', { val: Math.round(result[3].value), ack: true });
                    this.setStateAsync('Statistics_Total.Autarky', { val: Math.round(result[4].value), ack: true });
                    this.setStateAsync('Statistics_Total.OperatingTime', { val: result[5].value, ack: true });
                    if (this.config.readbattery) {
                        this.setStateAsync('Battery.ChargeCycles', { val: result[6].value, ack: true });
                    }
                })
                .catch(error => {
                    if (error.response) { //get HTTP error code
                        if (error.response == 404) {
                            this.log.error(`HTTP error 404 when calling Piko(-BA) API for total statistics: ${error.response.status}`);
                        }
                        this.log.error(`HTTP error when calling Piko(-BA) API for total statistics: ${error.response.status}`);
                    } else {
                        this.log.error(`Unknown error when calling Piko(-BA) API for total statistics: ${error.message}`);
                        this.log.error(`Please verify IP address: ${this.config.ipaddress} !! (e4)`);
                        if (this.supportsFeature && this.supportsFeature('PLUGINS')) {
                            const sentryInstance = this.getPluginInstance('sentry');
                            if (sentryInstance) {
                                const Sentry = sentryInstance.getSentryObject();
                                Sentry && Sentry.withScope(scope => {
                                    scope.setTag('Inverter', this.config.ipaddress);
                                    scope.setTag('Inverter-Type', InverterType);
                                    scope.setTag('Inverter-UI', InverterUIVersion);
                                    Sentry.captureException(error.message);
                                });
                            }
                        }
                    }
                }) // END catch
        } // END InverterAPIPiko

        if (InverterAPIPikoMP) { // code for Piko MP
            // missing code 
        } // END InverterAPIPikoMP

        try {
            clearTimeout(adapterIntervals.total);
            adapterIntervals.total = setTimeout(this.ReadPikoTotal.bind(this), this.config.polltimetotal);
        } catch (e) {
            this.log.error(`Error in setting adapter schedule for total statistics: ${e}`);
        } // END try catch

    } // END ReadPikoTotal


} // END Class


// @ts-ignore parent is a valid property on module
if (module.parent) {
    // Export the constructor in compact mode
    /**
    * @param {Partial<utils.AdapterOptions>} [options={}]
    */
    module.exports = (options) => new KostalPikoBA(options);
} else { // otherwise start the instance directly
    new KostalPikoBA();
}