const fs = require("fs");
const logger = require("pino")({
    prettyPrint: { colorize: true },
    translateTime: false
});
const _ = require("lodash");
const Table = require("cli-table");
const axios = require("axios");
const rateLimit = require("axios-rate-limit");
const configs = require("./configs");
const metricsMethods = require("@feedzai/analyzer-utilities/metricsMethods");
const utilities = require("@feedzai/analyzer-utilities");

/**
 * reporters
 *
 * Contains all functionality required to report the statistics of the analyzed repo
 *
 * @author Henrique Dias (henrique.dias@feedzai.com)
 */

const metricNames = metricsMethods.getMetricNames();

/**
 * Sends the results to a Json file
 * @param  {Object} stats
 * @param {Object} file
 */
function reportToJson(stats, file) {
    fs.writeFile(file, JSON.stringify(stats), function (err) {
        if (err) {
            logger.error(err);
        }

        logger.info("sucessufly saved to json file");
    });
}

/**
 * Writes to the `file` the given table (generated )
 * @param  {string} table
 * @param  {string} file
 */
function reportFormatedFile(table, file) {
    fs.writeFile(file, table, function (err) {
        if (err) {
            logger.error(err);
        }
        logger.info("sucessufly saved to formated file");
    });
}

/**
 * Responsable to generate table header
 * @returns {Array<string>}
 */
function consoleHeader() {
    return ["Repository"].concat(metricNames);
}

/**
 * Generates a line with the repository passed
 * @param  {Object} repo
 * @returns {Array<string>}
 */
function repoToConsoleLine(repo) {
    const line = [];

    line.push(repo.repository);

    for (let i = 0; i < metricNames.length; i++) {
        repo.metrics.forEach((metric) => {
            if (metric.info.name === metricNames[i]) {
                if (metric.result === null) {
                    logger.err("error on table");
                } else if (!_.isObject(metric.result) || !_.isObject(metric.result.result)) {
                    line.push("-");
                } else {
                    line.push(metric.result.result);
                }
            }
        });
    }
    return line;
}

/**
 * Receives an array with all statistics by repo, then generates the table and returns it as string
 * @param  {Array} stats
 * @returns {string}
 */
function generateTable(stats) {
    const table = new Table({
        chars: {
            "top": "═", "top-mid": "╤", "top-left": "╔", "top-right": "╗",
            "bottom": "═", "bottom-mid": "╧", "bottom-left": "╚", "bottom-right": "╝",
            "left": "║", "left-mid": "╟", "mid": "─", "mid-mid": "┼",
            "right": "║", "right-mid": "╢", "middle": "│"
        }

        // style:{ "padding-left": 10}
    });

    table.push(consoleHeader());
    stats.forEach((repo) => {
        table.push(repoToConsoleLine(repo));
    });
    return table.toString();
}

/**
 * Prints out the stats to console.
 * @param {Object} stats
 */
function reportToConsole(stats) {
    // eslint-disable-next-line no-console
    console.log(generateTable(stats));
}


/**
 * Reports statistics to elasticSearch
 * @param  {object} stats
 * @param  {object} elasticReporter
 */
function reportElastic(stats, elasticReporter, repository) {
    let time;

    stats.forEach((repo) => {
        if (_.isObject(repo)) {
            let repoObj = repository;

            const instanceAxios = rateLimit(axios.create({
                baseURL: `http://${elasticReporter.address}:${elasticReporter.port}`,
                auth: configs.getElasticKeys()

            }), configs.getElasticRateLimit());

            if (_.isObject(repoObj)) {
                time = utilities.getDateForCommit(utilities.getRepoFolder(repoObj), repo.hash);
                if (!_.isDate(time)) {
                    time = new Date();
                }
                if (_.isDate(time)) {
                    repo.metrics.forEach((metric) => {
                        if (_.isObject(metric)) {
                            let payload = {
                                "project": repo.repository,
                                "metric": `frontend_${metric.info.name.replace(/ /g, "_").toLowerCase()}`,
                                timestamp: time,
                                hash: repo.hash
                            };
                            if (_.isObject(metric.result) && _.isObject(metric.result.result)) {
                                _.merge(payload, metric.result.result);
                            } else {
                                _.merge(payload, metric.result);
                            }

                            if (_.isObject(metric.result) &&metric.info.name.includes("Version")) {
                                let version = metric.result.result;
                                version = version.replace("^", "");
                                let versionArray = version.split(".");
                                const calculatedVersion = parseFloat(`${versionArray[0]}.${versionArray[1]}`);
                                payload.result = calculatedVersion;
                            }

                            instanceAxios.post(`/fe-${metric.info.name.replace(/ /g, "-").toLowerCase()}/_doc`, payload)
                                .then(function (response) {
                                    logger.info("Record inserted into elastic");
                                })
                                .catch(function (error) {
                                    logger.error("Error inserting into elastic");
                                    logger.error(error);
                                });

                        }
                    });
                }
            }
        }
    });
}

/**
 * Responsable to process the reports
 * @param  {Object} stats
 */
function report(stats, repo) {

    reportElastic(stats, configs.getElasticReporter(), repo);

    if (configs.getAtiveReporters().includes("console")) {
        reportToConsole(stats);
    }
    if (configs.getAtiveReporters().includes("json")) {
        reportToJson(stats, configs.getJsonReporter()["output-file"]);
    }
    if (configs.getAtiveReporters().includes("formated-file")) {
        reportFormatedFile(generateTable(stats), configs.getFormatedFileLocation());
    }
    if (configs.getAtiveReporters().includes("elastic")) {
        reportElastic(stats, configs.getElasticReporter());
    }
}

module.exports = {
    report,
    reportElastic,
};
