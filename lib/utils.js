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
  const limit = req.query.per_page ? parseInt(req.query.per_page) : 25
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
  const s = relatedSelects ? selects.concat(relatedSelects) : selects
  return db.select(selects)
}

function curriedJoinFunction(pk) {
  return R.curry((resource, map) => {
    return (db) => {
      return db.leftOuterJoin(
        map.relatedTo,
        `${resource}.${map.source_column}`,
        `${map.relatedTo}.${map.target_column}`,
      )
    }
  })
}

function findModelsByName(name) {
  return R.find(R.propEq('name', name))
}

function createEmptyResourceFromColumns(name, columns) {
  return R.objOf(name)(
    R.fromPairs(R.map((item) => [item,null], columns))
  )
}

function selectMatchingColumns(columns, object) {
  return R.map(
    (value) => {
      if (typeof value === 'object' && value && value.length > 0) return value[0]
      return value
    },
    R.pickAll(columns, object)
  )
}


function createJoinFilter(models, related, resource, pk) {
  const relatedModel = findModelsByName(related)(models)
  const relatedColumns = R.map((column) => column.name, relatedModel.columns)
  const relatedObj = createEmptyResourceFromColumns(related, relatedColumns)

  return (results) => {
    const nested = R.map((result) => {

      const primaryResult = R.omit(
        relatedColumns,
        result
      )
      const secondaryResult = R.merge(
        relatedObj[related],
        selectMatchingColumns(relatedColumns, result)
      )

      primaryResult[related] = [secondaryResult]
      return primaryResult
    }, results)

    return R.values(R.map(
      (value) => {
        const c = R.reduce((a, b) => {
          return R.mergeWithKey((k, l, r) => {
            if (k === related) {
              return l.concat(r)
            }
            return r
          }, a, b)
        }, R.objOf(related, []), value)
        return c
      },
      R.groupBy((item) => item[pk], nested)
    ))
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
  createEmptyResourceFromColumns,
  selectMatchingColumns,
  composeList,
  createJoinFilter
}
