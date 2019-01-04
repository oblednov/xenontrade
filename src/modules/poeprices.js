const Base64 = require('js-base64').Base64;
const request = require("request-promise-native");
const _ = require("underscore");
const querystring = require('querystring');

class PoePrices {
  /**
  * Requests item price prediction from poeprices.info
  *
  * @param {string} itemText Item text copied from Path of Exile
  * @returns {Promise}
  * @fulfil {Object} - Object containing the requested item encoded in base64 and the result
  * @reject {Error} - The `error.message` contains information about why the promise was rejected
  */
  static request(itemText) {
    return new Promise(function(resolve, reject) {
      itemText = itemText.replace(/<<.*?>>|<.*?>/g, "");

      var url = "https://www.poeprices.info/api?";
      var parameters = querystring.stringify({ i: Base64.encode(itemText), l: config.get("league"), s: "xenontrade" });
      var parsedParams = querystring.parse(parameters);

      doRequestWithRetries();

      function doRequestWithRetries(retryCount = 0, retryLimit = 5, retryTimeout = 1000) {
        request(url + parameters, {json: true})
        .then((response) => {
          if(!PoePrices.hasAllKeys(response) || response.error !== 0) {
            var requestObject = { request: { parameters: parsedParams, itemText }, response };

            log.warn("Request to poeprices.info failed. Received an empty response.\n" + JSON.stringify(requestObject, null, 4));
            reject(new Error("Request to <b>poeprices.info</b> failed. Received an empty response."));
          } else {
            resolve({encodedItemText: parsedParams.i, price: response});
          }
        })
        .catch((error) => {
          if (error.statusCode === 403 && retryCount < retryLimit) {
            log.warn("Request to poeprices.info failed with error code 403. Retrying...");
            setTimeout(() => doRequestWithRetries(retryCount + 1), retryTimeout);
          } else {
            log.warn("Request to poeprices.info failed.\n" + JSON.stringify(error, null, 4));
            reject(new Error(`Request to <b>poeprices.info</b> failed (code ${error.statusCode}).`));
          }
        });
      }
    });
  }

  /**
  * Returns `true` if the response from poeprices.info has all required key properties
  *
  * @param {Object} response Response from poeprices
  * @returns {boolean}
  */
  static hasAllKeys(response) {
    var requiredKeys = ["currency", "min", "max", "pred_explanation", "error"];

    return _.every(requiredKeys, _.partial(_.has, response));
  }
}

module.exports = PoePrices;
