const configs = require("@feedzai/analyzer-utilities/configs");
const axios = require("axios");
const logger = require("pino")({
    prettyPrint: { colorize: true },
    translateTime: false
});
const _ = require("lodash");

/**
 * Loads the metrics form the configuration into the tool
 */
function loadMetrics() {
    configs.loadStandaloneConfig();
}

/**
 * Creates indexes into elasticsearch using the schema necessary for every metric
 */
function createIndexes() {
    configs.getMetrics().forEach((Metric) => {
        const base = {
            "mappings": {
                "properties": {
                    "metric": {
                        "type": "keyword"
                    },
                    "project": {
                        "type": "keyword"
                    },
                    "timestamp": {
                        "type": "date"
                    },
                    "hash": {
                        "type": "keyword"
                    }
                }
            }
        };

        // dummy initilization to get the schema
        const current = new Metric({}, "", {});

        // merge the keys from the schema into the complete metric
        _.merge(base.mappings.properties, current.schema());

        const elasticReporter = configs.getElasticReporter();

        // put the new index into elasticsearch
        axios.put(`http://${elasticReporter.address}:${elasticReporter.port}/fe-${current.info().name.replace(/ /g, "-")
            .toLowerCase()}`, base)
            .then(function () {
                logger.info(`Index for '${current.info().name}' added successfully`);
            })
            .catch(function (error) {
                logger.error("Error inserting into elastic");
                logger.error(error);
            });
    });
}


module.exports = {
    loadMetrics,
    createIndexes
};
