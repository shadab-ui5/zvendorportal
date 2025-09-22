sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "hodek/vendorportal/model/models",
    "hodek/vendorportal/utils/Formatter",
    "sap/ui/core/format/DateFormat",
    "sap/ui/core/date/UI5Date",
    'sap/ui/model/json/JSONModel'
], (Controller, Models, Formatter, DateFormat, UI5Date, JSONModel) => {
    "use strict";
    //QR & PDF in use libraries //
    //QR & PDF in use libraries //
    jQuery.sap.require("hodek.vendorportal.model.qrCode");
    jQuery.sap.require("hodek.vendorportal.model.jspdf");
    return Controller.extend("hodek.vendorportal.controller.ReprintAsn", {
        onInit: function () {
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteScheduleAgreeOrder").attachPatternMatched(this._onRouteMatched, this);
            this.oBusyDialog = new sap.m.BusyDialog({ text: "Loading data..." });
            this.oBusyDialog.open();
            this.bFirstLoadDone = false; // 🚩 Flag to control first load
            this.bHasMoreData = true;
            this.iSkip = 0;
            this.iTop = 200; // page size
            this.sQuery = ""; // store current search query
            let that = this;
            const oAsnModelVh = new sap.ui.model.json.JSONModel();
            const oSupplierVHModel = new sap.ui.model.json.JSONModel([]);
            const oPgVHModel = new sap.ui.model.json.JSONModel([]);
            const oAsnHeaderModel = new sap.ui.model.json.JSONModel([]);
            this.getOwnerComponent().setModel(oSupplierVHModel, "SupplierVHModel");
            this.getOwnerComponent().setModel(oAsnHeaderModel, "AsnHeaderModel");
            this.getOwnerComponent().setModel(oPgVHModel, "PgVHModel");
            this.getOwnerComponent().setModel(oAsnModelVh, "AsnModelVh");
            if (sap.ushell && sap.ushell.Container) {
                sap.ushell.Container.getServiceAsync("UserInfo").then(function (UserInfo) {
                    let loginUser = UserInfo.getId();
                    Models.getUserInfo(that, loginUser).then((oData) => {
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
                let loginUser = "CB9980000026"; // fallback or hardcoded for local testing
                Models.getUserInfo(that, loginUser).then((oData) => {
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
        _onRouteMatched: function (oEvent) {
            const oTable = this.byId("idAsnTable");
            oTable.setBusy(true); // Show busy indicator
            const oODataModel = this.getOwnerComponent().getModel("vendorModel");
            // Assuming the model name is "SaItemModel"
            const oSaItemModel = this.getOwnerComponent().getModel("AsnHeaderModel");
            this.oBusyDialog.open()
            this.loadPurchaseOrderFilter();
            // Use sPOId to filter model or fetch data
        },
        loadPurchaseOrderFilter: function () {
            // Load PO data and build company code model
            let _this = this;
            this.oBusyDialog.setText("Loading Data..");
            this.oBusyDialog.open()
            Models._loadAsn(this, this.sQuery, this.iSkip, this.iTop)
                .then(function (aResults) {
                    let oAsnModel = _this.getOwnerComponent().getModel("AsnHeaderModel");
                    let aExisting = oAsnModel.setProperty("/AsnData", aResults) || [];

                    // Append instead of overwrite
                    // oAsnModel.setProperty("/AsnData", aExisting.concat(aResults));

                    // Update skip for next load
                    // _this.iSkip += aResults.length;
                    _this.oBusyDialog.close();
                })
                .catch(function () {
                    _this.oBusyDialog.close();
                });
        },
        onSelectionChange: function (oEvent) {
            let oTable = this.byId("idAsnTable"); // Your table ID
            let aSelectedItems = oTable.getSelectedItems();

            let oButton = this.byId("idActionReprint"); // Your button ID
            oButton.setEnabled(aSelectedItems.length > 0);
        },
        formatter: Formatter,
        onFilterGo: function (oEvent) {
            this.iSkip = 0;
            this.iTop = 200; // page size
            this.sQuery = "onFilterGo";
            this.getOwnerComponent().getModel("AsnHeaderModel").setProperty("/AsnData", "");
            this.loadPurchaseOrderFilter();

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

        onAsnSearch: function (oEvent) {
            let sQuery = oEvent.getParameter("query").toLowerCase();
            this.sQuery = sQuery;
            this._poSkip = 0;
            this._poHasMore = true;

            const oModel = this.getView().getModel("AsnHeaderModel");
            const aAllPo = oModel.getProperty("/AsnData") || [];

            // Filter existing local data
            const aFilteredPo = aAllPo.filter(item =>
                Object.values(item).some(val =>
                    String(val).toLowerCase().includes(sQuery)
                )
            );

            if (aFilteredPo.length > 0) {
                // Use filtered data from local cache
                // this.applyDynamicFilter(oEvent.getSource().getBinding("items"), sQuery, ["AsnNo", "Plant", "InvoiceNo"]);
                this._applySearchFilter(sQuery);
            } else {
                this.iSkip = 0;
                this.iTop = 200; // page size
                this.loadPurchaseOrderFilter();
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

        onSearchAsn: function (oEvent) {
            var sQuery = oEvent.getParameter("query");
            this._applySearchFilter(sQuery);
        },

        _applySearchFilter: function (sQuery) {
            var oTable = this.byId("idAsnTable");
            var oBinding = oTable.getBinding("items");

            if (sQuery && sQuery.trim() !== "") {
                // Build OR filter for all searchable properties
                var aFilters = [
                    new sap.ui.model.Filter("AsnNo", sap.ui.model.FilterOperator.Contains, sQuery),
                    new sap.ui.model.Filter("InvoiceNo", sap.ui.model.FilterOperator.Contains, sQuery),
                    new sap.ui.model.Filter("Plant", sap.ui.model.FilterOperator.Contains, sQuery),
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
        handleReprint: function () {
            let oTable = this.byId("idAsnTable"); // Replace with your table ID
            let aSelectedContexts = oTable.getSelectedContexts(); // Works for sap.m.Table

            if (aSelectedContexts.length === 0) {
                sap.m.MessageToast.show("Please select at least one row.");
                return;
            }

            let aSelectedData = aSelectedContexts.map(function (oContext) {
                return oContext.getObject(); // Gets the row's data object
            });

            // console.log("Selected Row Data:", aSelectedData);

            // // Example: You can store it in a model for later use
            // let oModel = new sap.ui.model.json.JSONModel({ selectedRows: aSelectedData });
            // this.getOwnerComponent().setModel(oModel, "SelectedRowsModel");
            this.onViewQR(aSelectedData[0]);
        },
        onViewQR: function (qrData) {
            let that = this;
            //let oQRCodeBox = new sap.m.VBox({});
            let oQRCodeBox = this.getView().byId("idVBox_QRCode");
            oQRCodeBox.setVisible(true);
            const oHtmlComp = new sap.ui.core.HTML({
                content: '<canvas id="qrCanvas" width="200" height="200" style="display:none;"></canvas>'
            });
            oQRCodeBox.addItem(oHtmlComp);

            setTimeout(function () {
                let sQRCodeNumber = qrData.AsnNo; // Data to encode in QR Code
                // Generate QR Code using qrcode.js
                QRCode.toCanvas(document.getElementById('qrCanvas'), sQRCodeNumber, function (error) {
                    if (error) {
                        sap.m.MessageToast.show("QR Code generation failed!");
                        return;
                    }
                    sap.m.MessageToast.show("QR Code generated!");
                    // After generating the QR Code, create PDF
                    that._generatePDF(qrData);
                    // oQRCodeBox.setVisible(false);
                }.bind(this));
            }, 200);
        },
        _generatePDF: function (qrData) {
            var jsPDF = window.jspdf.jsPDF;
            //var doc = new jsPDF();
            var doc = new jsPDF('l', 'mm', [50, 25]);

            let invDate = new Date(qrData.InvoiceDate);
            let formattedInvDate = invDate.getDate().toString().padStart(2, '0') + '/' +
                (invDate.getMonth() + 1).toString().padStart(2, '0') + '/' +
                invDate.getFullYear();
            let sysDate = new Date(qrData.SystemDate);
            let formattedSystemDate = sysDate.getDate().toString().padStart(2, '0') + '/' +
                (sysDate.getMonth() + 1).toString().padStart(2, '0') + '/' +
                sysDate.getFullYear();

            doc.setFont("Helvetica", 'bold');
            doc.setFontSize(4.5);
            doc.setTextColor('#000');

            doc.text(2, 5, `ASN Number.: ${qrData.AsnNo}`);
            doc.text(2, 9, `Invoice Number.: ${qrData.InvoiceNo}`);
            doc.text(2, 13, `Invoice Date: ${formattedInvDate}`);

            // Get the canvas element for the QR code
            var canvas = document.getElementById('qrCanvas');
            var imgData = canvas.toDataURL('image/png');

            // Add the QR code image to the PDF
            doc.addImage(imgData, 'PNG', 35, 1, 15, 15); // Adjust size and position as necessary
            // doc.text(2, 17, `Supplier: ${qrData.SupplierName} ( ${qrData.Vendor} )`);
            let vendorText = `Supplier: ${qrData.SupplierName} ( ${qrData.Vendor} )`;
            let wrappedVendor = doc.splitTextToSize(vendorText, 40);
            doc.text(wrappedVendor, 2, 17, { maxWidth: 40, lineHeightFactor: 1.2 });
            // Save the PDF to a file
            doc.save(`ASN_${qrData.AsnNo}.pdf`);
        },
        onUpdateStartPoHeaderTable: function (oEvent) {
            // Skip first automatic trigger
            if (!this.bFirstLoadDone) {
                this.bFirstLoadDone = true;
                return;
            }

            // Check if it's really a scroll (reason = Growing)
            if (oEvent.getParameter("reason") === "Growing" && this.bHasMoreData) {
                this.loadMoreData();
            }
        },
        loadMoreData: function () {
            let _this = this;
            this.oBusyDialog.setText("Loading more data...");
            this.oBusyDialog.open();

            Models._loadAsn(this, this.sQuery, this.iSkip, this.iTop)
                .then(function (aResults) {
                    let oAsnModel = _this.getOwnerComponent().getModel("AsnHeaderModel");
                    let aExisting = oAsnModel.getProperty("/AsnData") || [];

                    oAsnModel.setProperty("/AsnData", aExisting.concat(aResults));

                    _this.iSkip += aResults.length;
                    if (aResults.length < _this.iTop) {
                        _this.bHasMoreData = false;
                    }
                    _this.oBusyDialog.close();
                })
                .catch(function () {
                    _this.oBusyDialog.close();
                });
        },



    });
});