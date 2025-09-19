sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "hodek/vendorportal/model/models",
    "hodek/vendorportal/utils/Formatter",
    "sap/ui/core/format/DateFormat",
    "sap/ui/core/date/UI5Date",
    'sap/ui/model/json/JSONModel'
], (Controller, Models, Formatter, DateFormat, UI5Date, JSONModel) => {
    "use strict";

    return Controller.extend("hodek.vendorportal.controller.VendorPortalScreen", {
        onInit: function () {
            const oODataModel = this.getOwnerComponent().getModel("vendorModel");
            const oFilterModel = new sap.ui.model.json.JSONModel();
            const oTableModel = new sap.ui.model.json.JSONModel();
            const oRouteData = new sap.ui.model.json.JSONModel();
            const oPlantModelVh = new sap.ui.model.json.JSONModel();
            const oCompanyModel = new sap.ui.model.json.JSONModel();

            this.getView().setModel(oCompanyModel, "CompanyCodeModel");
            this.getView().setModel(oPlantModelVh, "PlantModelVh");
            this.getOwnerComponent().setModel(oFilterModel, "filterModel");
            this.getOwnerComponent().setModel(oTableModel, "TableModelPO");
            this.getOwnerComponent().setModel(oRouteData, "RoutePoData");

            this.oBusyDialog = new sap.m.BusyDialog({ text: "Loading Filters.." });
            this.oBusyDialog.open();
            this.loginUser = "";
            let that = this;
            const oPoModelVh = new sap.ui.model.json.JSONModel();
            const oSupplierVHModel = new sap.ui.model.json.JSONModel([]);
            const oPgVHModel = new sap.ui.model.json.JSONModel([]);
            this.getOwnerComponent().setModel(oSupplierVHModel, "SupplierVHModel");
            this.getOwnerComponent().setModel(oPgVHModel, "PgVHModel");
            this.getOwnerComponent().setModel(oPoModelVh, "PoModelVh");
            if (sap.ushell && sap.ushell.Container) {
                sap.ushell.Container.getServiceAsync("UserInfo").then(function (UserInfo) {
                    that.loginUser = UserInfo.getId();
                    Models.getUserInfo(that, that.loginUser).then((oData) => {
                        const uniqueGroups = [...new Map(oData.results.map(obj => [obj.PurchasingGroup, obj])).values()];

                        that.getOwnerComponent().getModel("PgVHModel").setData(uniqueGroups);

                        that.getOwnerComponent().getModel("SupplierVHModel").setData(oData.results);
                        console.log("UserInfo Loaded..")
                        that.loadPurchaseOrderFilter();
                    }).catch((oError) => {
                        console.error("Failed to load Purchase Orders:", oError);
                    });
                });
            } else {
                console.warn("Not running in Fiori Launchpad, using fallback user");
                that.loginUser = "CB9980000026"; // fallback or hardcoded for local testing
                Models.getUserInfo(that, that.loginUser).then((oData) => {
                    const uniqueGroups = [...new Map(oData.results.map(obj => [obj.PurchasingGroup, obj])).values()];

                    that.getOwnerComponent().getModel("PgVHModel").setData(uniqueGroups);

                    that.getOwnerComponent().getModel("SupplierVHModel").setData(oData.results);
                    console.log("UserInfo Loaded..")
                    that.loadPurchaseOrderFilter();
                }).catch((oError) => {
                    console.error("Failed to load Purchase Orders:", oError);
                });;
            }

        },
        loadPurchaseOrderFilter: function () {
            // Load PO data and build company code model
            let that = this;
            that.oBusyDialog.setText("Setting Filters...");
            Models._loadPurchaseOrders(this, "", 0, 4999).then((result) => {
                const uniqueCompanies = [...new Map(
                    result
                        .filter(item => item.CompanyCode)
                        .map(item => [item.CompanyCode, { CompanyCode: item.CompanyCode, CompanyCodeName: item.CompanyCodeName }])
                ).values()];
                that.oBusyDialog.setText("Almost Done...");
                that.getView().getModel("CompanyCodeModel").setData(uniqueCompanies);
                that.getView().byId("idPoCompanyCode")?.getBinding("items")?.refresh();

                console.log("Company codes loaded:", that.getView().getModel("CompanyCodeModel").getData());

                // ✅ Load dependent filters AFTER company codes are set
                const aCompanyCodes = this.getView().getModel("CompanyCodeModel")?.getData();

                // Example: preselect first company, or filter something else
                if (aCompanyCodes?.length === 1) {
                    this.getView().byId("idPoCompanyCode").setSelectedKey(aCompanyCodes[0].CompanyCode);
                }
                that.onFilterGo();
                that.oBusyDialog.close();
            }).catch((oError) => {
                that.oBusyDialog.close();
                console.error("Failed to load Purchase Orders:", oError);
            });
        },

        formatter: Formatter,
        onFilterGo: function (oEvent) {
            const oView = this.getView();
            const oModel = this.getOwnerComponent().getModel("vendorModel"); // OData model
            const oTableModel = this.getOwnerComponent().getModel("TableModelPO"); // Target model for results
            const oFilterModel = this.getOwnerComponent().getModel("FilterModel");
            Models.searchPoHeader(this, oView, oModel, oTableModel)

        },
        onLineItemPress: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("listItem"); // or getSource()
            const oContext = oSelectedItem.getBindingContext("TableModelPO");
            const oData = oContext.getObject();
            this.getOwnerComponent().getModel("RoutePoData").setProperty("/PoHeader", oData);
            // Example: Navigate to another route with PurchaseOrder as parameter
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RoutePurchaseOrder", {
                po: oData.PurchaseOrder // pass any key you need
            });

            // OR: If opening a dialog or using in-place display:
            // this.getView().getModel("DetailModel").setData(oData);
        },
        onNavBack: function () {
            let oHistory = sap.ui.core.routing.History.getInstance();
            let sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("RouteVendorPortal", {}, true); // replace with actual route
            }
        },
        /////////////
        onSupplierValueHelp: function () {
            let oView = this.getView();

            if (!this._oSupplierDialog) {
                this._oSupplierDialog = sap.ui.xmlfragment("hodek.vendorportal.fragments.SupplierValueHelp", this);
                oView.addDependent(this._oSupplierDialog);
            }

            // Set model from previously loaded one
            this._oSupplierDialog.setModel(oView.getModel("SupplierVHModel"));
            this._oSupplierDialog.open();
        },

        onSupplierSearch: function (oEvent) {
            let sQuery = oEvent.getParameter("value")?.trim().toLowerCase();
            let aFilters = [
                new sap.ui.model.Filter("Supplier", sap.ui.model.FilterOperator.Contains, sQuery),
                new sap.ui.model.Filter("Suppliername", sap.ui.model.FilterOperator.Contains, sQuery),
                new sap.ui.model.Filter("PurchasingGroup", sap.ui.model.FilterOperator.Contains, sQuery),
                new sap.ui.model.Filter("PurchasingGrpName", sap.ui.model.FilterOperator.Contains, sQuery)
            ];
            const oModel = this.getView().getModel("SupplierVHModel");
            const aAllPo = oModel.getData() || [];
            const aFilteredPo = aAllPo.filter(item =>
                Object.values(item).some(val =>
                    String(val).toLowerCase().includes(sQuery)
                )
            );

            if (aFilteredPo.length > 0) {
                // Use filtered data from local cache
                this.applyDynamicFilter(oEvent.getSource().getBinding("items"), sQuery, ["Suppliername", "PurchasingGroup", "PurchasingGrpName", "Supplier"]);

            } else {
                let oBinding = oEvent.getSource().getBinding("items");
                oBinding.filter(new sap.ui.model.Filter(aFilters, false));
            }
        },

        onSupplierConfirm: function (oEvent) {
            let aSelectedContexts = oEvent.getParameter("selectedContexts");
            let oMultiInput = this.byId("idPoSupplier");
            oMultiInput.removeAllTokens();

            if (aSelectedContexts && aSelectedContexts.length) {
                aSelectedContexts.forEach(function (oContext) {
                    let oData = oContext.getObject();
                    oMultiInput.addToken(new sap.m.Token({
                        key: oData.Supplier,
                        text: oData.Supplier + " - " + oData.Suppliername
                    }));
                });
            }
        },
        onPurchaseOrderValueHelp: function () {
            let oView = this.getView();

            if (!this._oPoDialog) {
                this._oPoDialog = sap.ui.xmlfragment("hodek.vendorportal.fragments.PurchaseOrderValueHelp", this);
                oView.addDependent(this._oPoDialog);
            }
            this._oPoDialog.open();

        },

        onPurchaseOrderSearch: function (oEvent) {
            let sQuery = oEvent.getParameter("value")?.trim().toLowerCase();
            this._poSearchQuery = sQuery;
            this._poSkip = 0;
            this._poHasMore = true;

            const oModel = this.getView().getModel("PoModelVh");
            const aAllPo = oModel.getProperty("/PurchaseOrders") || [];

            // Filter existing local data
            const aFilteredPo = aAllPo.filter(item =>
                Object.values(item).some(val =>
                    String(val).toLowerCase().includes(sQuery)
                )
            );

            if (aFilteredPo.length > 0) {
                // Use filtered data from local cache
                this.applyDynamicFilter(oEvent.getSource().getBinding("items"), sQuery, ["Plant", "CompanyCode", "PurchasingGroup", "Supplier", "PurchaseOrder"]);

            } else {
                this._oPoDialog.setBusy(true);
                Models._loadPurchaseOrders(this, sQuery, 0, 2000)
                    .then(() => {
                        this._oPoDialog.setBusy(false); // ✅ Stop busy after success
                    })
                    .catch((oError) => {
                        this._oPoDialog.setBusy(false); // ✅ Also stop busy on error
                        console.error("Failed to load Purchase Orders:", oError);
                    });
            }
        },
        onPurchaseOrderConfirm: function (oEvent) {
            let aSelectedContexts = oEvent.getParameter("selectedContexts");
            let oMultiInput = this.byId("idPoNumber");
            let oInputSupplier = this.byId("idPoSupplier");
            let oInputPurchaseGrp = this.byId("idPoPurchGroup");
            let oInputPlant = this.byId("idFilterPlant");
            oInputSupplier.removeAllTokens();
            oInputPurchaseGrp.removeAllTokens();
            oMultiInput.removeAllTokens();
            oInputPlant.removeAllTokens();

            if (aSelectedContexts && aSelectedContexts.length) {
                aSelectedContexts.forEach(function (oContext) {
                    let oData = oContext.getObject();
                    oMultiInput.addToken(new sap.m.Token({
                        key: oData.PurchaseOrder,
                        text: oData.PurchaseOrder
                    }));
                    oInputSupplier.addToken(new sap.m.Token({
                        key: oData.Supplier,
                        text: oData.Supplier
                    }));
                    oInputPurchaseGrp.addToken(new sap.m.Token({
                        key: oData.PurchasingGroup,
                        text: oData.PurchasingGroup
                    }));
                    oInputPlant.addToken(new sap.m.Token({
                        key: oData.Plant,
                        text: oData.Plant
                    }));
                });
            }
        },

        onPurchasingGroupValueHelp: function () {
            let oView = this.getView();

            if (!this._oPgDialog) {
                this._oPgDialog = sap.ui.xmlfragment("hodek.vendorportal.fragments.PurchasingGroupValueHelp", this);
                oView.addDependent(this._oPgDialog);
            }
            this._oPgDialog.open();
        },
        onPurchasingGroupSearch: function (oEvent) {
            let sQuery = oEvent.getParameter("value")?.trim().toLowerCase();
            this._pgSearchQuery = sQuery;
            this._pgSkip = 0;
            this._pgHasMore = true;
            const oModel = this.getView().getModel("PgModelVh");
            const aAllPurchaseGroup = oModel.getProperty("/PurchasingGroups") || [];


            // Use filtered data from local cache
            this.applyDynamicFilter(oEvent.getSource().getBinding("items"), sQuery, ["PurchaseOrder", "PurchasingGroup", "Supplier"]);


        },
        onPurchasingGroupConfirm: function (oEvent) {
            let aSelectedContexts = oEvent.getParameter("selectedContexts");
            let oMultiInput = this.byId("idPoPurchGroup");
            oMultiInput.removeAllTokens();

            if (aSelectedContexts && aSelectedContexts.length) {
                aSelectedContexts.forEach(function (oContext) {
                    let oData = oContext.getObject();
                    oMultiInput.addToken(new sap.m.Token({
                        key: oData.PurchasingGroup,
                        text: oData.PurchasingGroup
                    }));
                });
            }
        },

        onPlantValueHelp: function () {
            let oView = this.getView();

            if (!this._oPlantDialog) {
                this._oPlantDialog = sap.ui.xmlfragment("hodek.vendorportal.fragments.PlantValueHelp", this);
                oView.addDependent(this._oPlantDialog);
            }

            this._plantSearchQuery = "";
            this._plantSkip = 0;
            this._plantHasMore = true;
            this._plantDialogOpened = false;
            this._plantInitialLoadDone = false;

            this._oPlantDialog.setBusy(true);

            Models._loadPlants(this, "", 0, 2000, (aData) => {
                const uniqueResults = aData.results.filter((item, index, self) =>
                    index === self.findIndex(t => JSON.stringify(t) === JSON.stringify(item))
                );
                let oModel = this.getView().getModel("PlantModelVh");
                oModel.setProperty("/Plants", uniqueResults);
                this._plantSkip += aData.length;
                this._plantDialogOpened = true;
                this._plantInitialLoadDone = true;
                this._oPlantDialog.setBusy(false);
                this._oPlantDialog.open();
            });
        },
        onPlantSearch: function (oEvent) {
            let sQuery = oEvent.getParameter("value")?.trim().toLowerCase();
            this._plantSearchQuery = sQuery;
            this._plantSkip = 0;
            this._plantHasMore = true;

            const oModel = this.getView().getModel("PlantModelVh");
            const aAllPlants = oModel.getProperty("/Plants") || [];

            // Filter existing local data
            const aFilteredPlants = aAllPlants.filter(item =>
                Object.values(item).some(val =>
                    String(val).toLowerCase().includes(sQuery)
                )
            );

            if (aFilteredPlants.length > 0) {
                // Use filtered data from local cache
                this.applyDynamicFilter(oEvent.getSource().getBinding("items"), sQuery, ["PlantName", "Plant"]);

            } else {
                // Fallback: hit the service
                this._oPlantDialog.setBusy(true);

                Models._loadPlants(this, sQuery, 0, 2000, (aData) => {
                    const uniqueResults = aData.results.filter((item, index, self) =>
                        index === self.findIndex(t => JSON.stringify(t) === JSON.stringify(item))
                    );

                    oModel.setProperty("/Plants", uniqueResults);
                    this._plantSkip += aData.length;
                    this._plantHasMore = aData.length === 2000;
                    this._oPlantDialog.setBusy(false);
                });
            }
        },
        onPlantConfirm: function (oEvent) {
            let aSelectedContexts = oEvent.getParameter("selectedContexts");
            let oMultiInput = this.byId("idFilterPlant");
            oMultiInput.removeAllTokens();

            if (aSelectedContexts && aSelectedContexts.length) {
                aSelectedContexts.forEach(function (oContext) {
                    let oData = oContext.getObject();
                    oMultiInput.addToken(new sap.m.Token({
                        key: oData.Plant,
                        text: oData.PlantName
                    }));
                });
            }
        },
        applyDynamicFilter: function (oBinding, sQuery, aFieldNames) {
            let aFilters = aFieldNames.map(sField =>
                new sap.ui.model.Filter(sField, sap.ui.model.FilterOperator.Contains, sQuery)
            );

            let oCombinedFilter = new sap.ui.model.Filter({
                filters: aFilters,
                and: false
            });

            oBinding.filter([oCombinedFilter]);
        },
        onLiveChange: function (oEvent) {
            var sQuery = oEvent.getParameter("newValue");
            this._applySearchFilter(sQuery);
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query");
            this._applySearchFilter(sQuery);
        },

        _applySearchFilter: function (sQuery) {
            var oTable = this.byId("idProductsTable");
            var oBinding = oTable.getBinding("items");

            if (sQuery && sQuery.trim() !== "") {
                // Build OR filter for all searchable properties
                var aFilters = [
                    new sap.ui.model.Filter("PurchaseOrder", sap.ui.model.FilterOperator.Contains, sQuery),
                    new sap.ui.model.Filter("purchaseOrderText", sap.ui.model.FilterOperator.Contains, sQuery),
                    new sap.ui.model.Filter("SupplierName", sap.ui.model.FilterOperator.Contains, sQuery),
                    new sap.ui.model.Filter("Supplier", sap.ui.model.FilterOperator.Contains, sQuery),
                    // new sap.ui.model.Filter("PurchaseOrderDate", sap.ui.model.FilterOperator.Contains, sQuery),
                    new sap.ui.model.Filter("SupplierRespSalesPersonName", sap.ui.model.FilterOperator.Contains, sQuery),
                    // new sap.ui.model.Filter("PlantName", sap.ui.model.FilterOperator.Contains, sQuery),
                    // new sap.ui.model.Filter("Plant", sap.ui.model.FilterOperator.Contains, sQuery)
                ];

                var oFilter = new sap.ui.model.Filter({
                    filters: aFilters,
                    and: false // OR across all fields
                });

                // Apply search as "Application" filter so it works with other filters
                oBinding.filter([oFilter], "Application");
            } else {
                // Clear only the search filter
                oBinding.filter([], "Application");
            }
        },


        // handleChange: function (oEvent) {
        // 	var sFrom = oEvent.getParameter("from"),
        // 		sTo = oEvent.getParameter("to"),
        // 		bValid = oEvent.getParameter("valid"),
        // 		oEventSource = oEvent.getSource(),
        // 		oText = this.byId("TextEvent");

        // 	this._iEvent++;

        // 	oText.setText("Id: " + oEventSource.getId() + "\nFrom: " + sFrom + "\nTo: " + sTo);

        // 	if (bValid) {
        // 		oEventSource.setValueState(ValueState.None);
        // 	} else {
        // 		oEventSource.setValueState(ValueState.Error);
        // 	}
        // }



    });
});