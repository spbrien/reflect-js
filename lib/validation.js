const Joi = require('joi')
const R = require('ramda')
const { findModelsByName } = require('./querybuilder/utils.js')

function validateQueryString(models, relationships, req) {
  const model = findModelsByName(models)(req.params.resource)
  const columns = R.map((item) => item.name, model.columns)
  const related = R.map((item) => item.relatedTo, R.filter(
    (item) => item.resource === req.params.resource,
    relationships
  ))
  const queryString = req.query

  const schema = Joi.object().keys({
    limit: Joi.string().regex(/^[0-9]+$/, 'numbers'),
    offset: Joi.string().regex(/^[0-9]+$/, 'numbers'),
    // Validate that where query is properly formed
    where: Joi.object({
      arg: Joi.string().valid(columns),
      value: Joi.object({
        arg: Joi.string().valid(
          "$gt",
          "$gte",
          "$lt",
          "$lte",
          "$ne",
          "$eq",
          "$between",
          "$notBetween",
          "$in",
          "$notIn",
          "$like",
          "$notLike"
        ),
        value: Joi.object({
          arg: Joi.string().valid(columns),
          value: Joi.string()
        })
      }),
    }),
    orderby: Joi.string().valid(columns),
    order: Joi.string().valid('asc', 'desc').insensitive(),
    attributes: Joi.array().items(Joi.string().valid(columns)),
    includes: Joi.array().items(
      Joi.object().keys({
        resource: Joi.string().valid(related),
        where: Joi.object({
          arg: Joi.string().valid(columns),
          value: Joi.object({
            arg: Joi.string().valid(
              "$gt",
              "$gte",
              "$lt",
              "$lte",
              "$ne",
              "$eq",
              "$between",
              "$notBetween",
              "$in",
              "$notIn",
              "$like",
              "$notLike"
            ),
            value: Joi.object({
              arg: Joi.string().valid(columns),
              value: Joi.string()
            })
          }),
        }),
      })
    ),
  })

  return Joi.validate(queryString, schema)
}

module.exports = {
  validateQueryString
}
