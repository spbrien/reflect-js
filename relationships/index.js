module.exports = [
  {
    resource: "PlotForms",
    relatedTo: "Counties",
    direct: true,
    source_column: "CountyID",
    target_column: "CountyId"
  },
  {
    resource: "PlotForms",
    relatedTo: "Crops",
    direct: true,
    source_column: "CropID",
    target_column: "CropId"
  },
  {
    resource: "PlotForms",
    relatedTo: "States",
    direct: false,
    through: "Counties",
    source_column: "CountyID",
    intermediate_target_column: "StateID",
    intermediate_source_column: "CountyID",
    target_column: "StateID",
  },
]
