const fs = require("fs");
const logger = require("pino")({
    prettyPrint: { colorize: true },
    translateTime: false
});
const path = require("path");
const argv = require("yargs").argv;
const _ = require("lodash");
const { loadMetrics } = require('./metricsMethods');

let metrics;
/**
 * configs
 *
 * Contains all methods responsible for all configs
 *
 * @author Henrique Dias (henrique.dias@feedzai.com)
 */

let config = {};

/**
 * Opens the `file`(with full path) containing returns his parsed contents
 * @param  {string} file
 * @returns {Object | undefined}
 */
function loadConfigFromFile(file) {
    try {
        const configs = JSON.parse(fs.readFileSync(file, "utf8"));

        // TODO garantir que a estrutura do ficheiro é a correta
        return configs;
    } catch (err) {
        logger.error(`Error trying to load '${file}' `);
        return undefined;
    }
}

/**
 * Loads the username and password passed by cli
 */
function loadPipelineKeys() {
    if (_.isString(argv.username) && _.isString(argv.password)) {
        if (_.isUndefined(config.elastic)) {
            config.elastic = {};
        }
        config.elastic.username = argv.username;
        config.elastic.password = argv.password;
    };
}
/**
 * Returns the rate limit configurations
 * @returns {object}
 */
function getElasticRateLimit() {
    if (_.isObject(config.elastic) && _.isObject(config.elastic["rate-limit"])) {
        return config.elastic["rate-limit"];
    }
}
/**
 * Responsible to load the configs, if config file passed by argument, overrides default values
 * @param  {string} defaultFile
 */
function loadConfigs(defaultFile) {

    // tries to load default config from file
    config = loadConfigFromFile(defaultFile);

    // if file not found, tries to load file specified with args
    if (!_.isObject(config) && !_.isString(argv.file)) {
        logger.error(`You must specify the config file via args or place it on ${defaultFile}`);
        throw new Error("You must specify the config file via args");
    } else if (_.isObject(config)) {
        logger.info(`Default '${defaultFile}' loaded with success`);
    }

    // if local config detected, overrides default
    const local = loadConfigFromFile(path.join(`${__dirname}`, `../fe-analyzer-config.json`));

    if (_.isObject(local)) {
        _.assign(config, local);
    } else {
        logger.warn("Local config not detected...");
    }

    // if any config specified, overrides default and local
    if (_.isString(argv.file)) {
        if (!_.isObject(loadConfigFromFile(argv.file))) {
            logger.error("File specified via arg was not found or is not valid. Trying to load default..");
            if (!_.isObject(loadConfigFromFile(defaultFile))) {
                logger.error("Error opening default file... Now exiting ");
                throw new Error("Error opening default file... Now exiting ");
            } else {
                logger.info("Default config loaded with success");
            }
        } else {
            logger.info(`manual file: ${argv.file} loaded with success`);
        }
    }

}

/**
 * Returns the factor specified in the CLI
 * @returns {number}
 */
function getCommitFactor() {
    if (_.isNumber(argv.factor) && argv.factor > 0) {
        return argv.factor;
    }
    return 1;
}

/**
 * Checks if the history flag was specified
 * @returns {boolean}
 */
function isHistoryActivated() {
    if (argv.history) {
        return true;
    }
    return false;
}

/**
 * Returns auth keys for elasticsearch
 * @returns {object}
 */
function getElasticKeys() {
    return config.elastic;
}

/**
 * Returns an object with all the email configuration
 * @returns {Object}
 */
function getEmailConfig() {
    return config.reporters.email;
}

/**
 * Returns an object with all recipients that will receive stats through email
 * @returns {Object}
 */
function getEmailRecipients() {
    return getEmailConfig().recipients.map((person) => {
        return person.email;
    });
}

/**
 * Returns all repos being analyzed
 * @returns {Array}
 */
function getRepoList() {
    return config.repos;
}

/**
 * Returns the folder where all metrics are located
 * @returns {Object}
 */
function getMetricsFolder() {
    return config["metrics-folder"];
}

/**
 * Retrieves all active reporters
 * @returns {Array}
 */
function getAtiveReporters() {
    return config.reporters.active;
}

/**
 * Returns json reporter config
 * @returns {Object}
 */
function getJsonReporter() {
    return config.reporters.json;
}

/**
 * Returns the location for the formated file output
 * @returns {string}
 */
function getFormatedFileLocation() {
    return config.reporters["formated-file"];
}

/**
 * Returns elasticsearch info in the config file
 * @returns {object}
 */
function getElasticReporter() {
    return config.reporters.elastic;
}

/**
 * Loads the configuration from the config project and cli arguments
 */
function loadStandaloneConfig() {

    loadPipelineKeys();

    const configPath = `${process.cwd()}/.repo-analyzer`;

    if (!fs.existsSync(configPath)) {
        const fdzConfig = {
            extends: "feedzai-config"
        }
        fs.writeFileSync(configPath, JSON.stringify(fdzConfig))
    }

    try {
        const configs = JSON.parse(fs.readFileSync(configPath, "utf8"));

        const conf = require(configs.extends);

        metrics = conf.metrics.map(require);

        //loads the metrics into the tool
        loadMetrics(metrics);

        config.reporters = conf.reporters;

        config.elastic = conf.reporters.elastic;

        loadPipelineKeys();

    } catch (err) {
        console.log(err);
        logger.error(`Error trying to load config `);
        return undefined;
    }
}

/**
 * Returns all metrics loaded
 * @returns {Array}
 */
function getMetrics() {
    return metrics;
}

module.exports = {
    loadConfigs,
    getEmailConfig,
    getEmailRecipients,
    getRepoList,
    getMetricsFolder,
    getAtiveReporters,
    getJsonReporter,
    getFormatedFileLocation,
    getElasticReporter,
    getElasticKeys,
    getElasticRateLimit,
    getCommitFactor,
    isHistoryActivated,
    loadStandaloneConfig,
    getMetrics
};
