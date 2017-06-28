// Manually add relationship settings
// ----------------------------------
module.exports = [
  // {
  //   resource: "wp_posts",
  //   relatedTo: "wp_postmeta",
  //   direct: true,
  //   source_column: "ID",
  //   target_column: "post_id"
  // },
  // {
  //   resource: "wp_posts",
  //   relatedTo: "wp_posts",
  //   direct: false,
  //   through: "wp_postmeta",
  //   source_column: "ID",
  //   intermediate_target_column: "post_id",
  //   intermediate_source_column: "meta_id",
  //   target_column: "ID",
  //   as: "wp_posts"
  // },
  {
    resource: "Counties",
    relatedTo: "States",
    direct: true,
    source_column: "StateId",
    target_column: "Id"
  },
  {
    resource: "Counties",
    relatedTo: "ZipCodes",
    direct: false,
    through: "CountyZipCodes",
    source_column: "Id",
    intermediate_target_column: "ZipCodeId",
    intermediate_source_column: "CountyId",
    target_column: "Id",
    as: "CountyZipcodes"
  },
  {
    resource: "CropProducts",
    relatedTo: "Products",
    direct: true,
    source_column: "ProductId",
    target_column: "Id"
  },
  {
    resource: "CropProducts",
    relatedTo: "Platforms",
    direct: true,
    source_column: "PlatformId",
    target_column: "Id"
  },
  {
    resource: "CropProducts",
    relatedTo: "Crops",
    direct: true,
    source_column: "CropId",
    target_column: "Id"
  },
  {
    resource: "CropProducts",
    relatedTo: "MeasurementUnit",
    direct: true,
    source_column: "MeasurementUnitId",
    target_column: "Id"
  },
  {
    resource: "CropRegions",
    relatedTo: "Crops",
    direct: true,
    source_column: "CropId",
    target_column: "Id"
  },
  {
    resource: "Crops",
    relatedTo: "CropRegions",
    direct: true,
    source_column: "Id",
    target_column: "CropId"
  },
  {
    resource: "States",
    relatedTo: "Counties",
    direct: true,
    source_column: "Id",
    target_column: "StateId"
  }
]
