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
    resource: "PracticeData",
    relatedTo: "CropTypeData",
    direct: true,
    source_column: "CropTypeId",
    target_column: "Id"
  },
  {
    resource: "PracticeData",
    relatedTo: "GeographicRegionData",
    direct: false,
    through: "CropRegionData",
    source_column: "CropRegionId",
    intermediate_target_column: "Id",
    intermediate_source_column: "GeographicRegionId",
    target_column: "Id",
    as: "PracticeData"
  }
]
