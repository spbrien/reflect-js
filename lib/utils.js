const R = require('ramda')

// Error Handling and Responses
// -----------------------------

function errorStatus(res, status, error) {
  return res
    .set('Content-Type', 'application/json')
    .status(status)
    .json({
      status: status,
      error: error
    })
}

function successStatus(status, data) {
  return res
    .set('Content-Type', 'application/json')
    .status(status)
    .json({
      status: status,
      data: data
    })
}

// Parsing and Transformation of Parameters
// ------------------------------------------

function paramTransform(req) {
  const limit = parseInt(req.query.per_page) || parseInt(req.query.limit) || 25
  const params = {
    limit: limit,
    offset: req.query.page ? parseInt(req.query.page * limit) : 0,
    where: req.query.where ? JSON.parse(req.query.where) : null,
    orderby: req.query.orderby ? req.query.orderby.toLowerCase() : null,
    order: req.query.order ? req.query.order : null,
    attributes: req.query.attributes ? JSON.parse(req.query.attributes) : null,
    include: req.query.includes ? JSON.parse(req.query.includes) : null
  }
  return R.filter((item) => item, params)
}

function responseTransform(req, res) {
  return res
    .set('Content-Type', 'application/json')
    .json(req.apiData)
}

// Filtering, nesting and query result manipulation
// -------------------------------------------------


const toTitle = R.compose(
  R.join(''),
  R.over(R.lensIndex(0), R.toUpper)
)

function getPrimaryKey(model) {
  const column = R.find((item) => item.primaryKey === true, model.columns)
  return column.name
}

function getWhereFunctionName(operator, fn) {
    return operator ? `${operator}${toTitle(fn)}` : fn
}

const whereOperators = {
  $gt: {
    funcName: 'where',
    comparison: '>',
  },
  $gte: {
    funcName: 'where',
    comparison: '>=',
  },
  $lt: {
    funcName: 'where',
    comparison: '<',
  },
  $lte: {
    funcName: 'where',
    comparison: '<=',
  },
  $ne: {
    funcName: 'where',
    comparison: '!=',
  },
  $eq: {
    funcName: 'where',
    comparison: '=',
  },
  $between: {
    funcName: 'whereBetween',
    comparison: null,
  },
  $notBetween: {
    funcName: 'whereNotBetween',
    comparison: null,
  },
  $in: {
    funcName: 'whereIn',
    comparison: null,
  },
  $notIn: {
    funcName: 'whereNotIn',
    comparison: null,
  },
  $like: {
    funcName: 'where',
    comparison: 'like',
  },
  $notLike: {
    funcName: 'where',
    comparison: 'not like',
  },
}

function composeList(list) {
  return list.length > 0 ? R.apply(R.compose, list) : (item) => item
}

function curriedQueryFunction() {
  return R.curry((operator, column, comparison, value) => {
    if (whereOperators[comparison]) {
      const fn = getWhereFunctionName(operator, whereOperators[comparison].funcName)
      if (whereOperators[comparison].comparison) {
        return (db, operatorOverride) => {
          if (operatorOverride) {
            return db.where(column, whereOperators[comparison].comparison, value)
          }
          return db[fn](column, whereOperators[comparison].comparison, value)
        }
      }
      return (db, operatorOverride) => {
        if (operatorOverride) {
          return db.where(column, whereOperators[comparison].comparison, value)
        }
        return db[fn](column, value)
      }
    }
  })
}

function createSelects(db, selects, relatedSelects) {
  const s = relatedSelects ? selects.concat(R.flatten(relatedSelects)) : selects
  return db.select(s)
}

// TODO: Probably pass in models and derive primary key for each resource instead of passing in pk
function curriedJoinFunction(models) {
  return R.curry((resource, map, joinSubQueryFunctions) => {
    const relatedPk = getPrimaryKey(findModelsByName(map.relatedTo)(models))

    return (db) => {
      return db.leftOuterJoin(
        map.relatedTo,
        function() {
          if (!joinSubQueryFunctions) {
            this.on(
              `${resource}.${map.source_column}`,
              `${map.relatedTo}.${map.target_column}`
            )
          } else {
            console.log("SUB QUERY FUNCTIONS: ", joinSubQueryFunctions)
            // TODO: This is the query I need to build dynamically
            // ProductTrialID is the primary key
            // Any .where functions should be built in the query.js file,
            // then passed in as an array / argument to the function with db,
            // then applied to the this.select below with composeList
            this.on(
              `${resource}.${map.source_column}`,
              `${map.relatedTo}.${map.target_column}`
            ).onIn(
              `${map.relatedTo}.${relatedPk}`,
              function() {
                composeList(joinSubQueryFunctions)(
                  this.select(`${map.relatedTo}.${relatedPk}`).from(`${map.relatedTo}`)
                )
              }
            )
          }
        }
      )
    }
  })
}

function findModelsByName(name) {
  return R.find(R.propEq('name', name))
}

function selectMatchingColumns(columns, object, related, idx) {
  related = related || []
  return R.mapObjIndexed(
    (value, key) => {
      if (
        typeof value === 'object' &&
        value &&
        value.length > 0 &&
        !R.contains(key, related)
      ) return value[idx]
      return value
    },
    R.pickAll(R.concat(columns, related), object)
  )
}

const mapIndexed = R.addIndex(R.map)


function joinFilters(models, results, resource, pk, related) {
  const primaryModel = findModelsByName(resource)(models)
  const primaryColumnNames = R.map(item => item.name, primaryModel.columns)

  return (results) => {
    const grouped = R.groupBy((result) => {
      return result[pk].length > 0 ? result[pk][0] : result[pk]
    }, results)
    const merged = R.values(R.map(
      (group) => {
        // console.log("GROUP LENGTH: ", group.length)
        // console.log(group)
        // Get primary item
        const primaryItemData = selectMatchingColumns(
          primaryColumnNames, group[0], related, 0
        )
        // Get all related items in a list
        const relatedItems = mapIndexed((item, idx) => {
          const itemModel = findModelsByName(item)(models)
          const itemPk = getPrimaryKey(itemModel)
          const itemColumnNames = R.map(item => item.name, itemModel.columns)
          return R.objOf(item, R.dropRepeats(
            R.filter(item => item, R.map((groupItem) => {
              const itemColumns = selectMatchingColumns(
                itemColumnNames, groupItem, related, idx
              )
              if (itemColumns[itemPk]) return itemColumns
              return null
            }, group)))
          )
        }, related)

        return R.merge(primaryItemData, R.mergeAll(relatedItems))
      }, grouped
    ))

    return merged
  }
}

module.exports = {
  errorStatus,
  successStatus,
  paramTransform,
  responseTransform,
  toTitle,
  getPrimaryKey,
  getWhereFunctionName,
  whereOperators,
  curriedQueryFunction,
  curriedJoinFunction,
  createSelects,
  findModelsByName,
  selectMatchingColumns,
  composeList,
  joinFilters,
}
