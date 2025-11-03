sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "hodek/vendorportal/model/models",
    // "hodek/vendorportal/model/qrcodeNew",
    "hodek/vendorportal/utils/Formatter",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/m/library",
    'sap/ui/core/library',
    "sap/ui/core/format/DateFormat",
    "sap/m/UploadCollectionParameter",
    "sap/ui/model/json/JSONModel"
], (Controller, Models, Formatter, Dialog, Button, MessageBox, MessageToast, Fragment, mobileLibrary, coreLibrary, DateFormat, UploadCollectionParameter, JSONModel) => {
    "use strict";
    //QR & PDF in use libraries //
    jQuery.sap.require("hodek.vendorportal.model.qrCode");
    jQuery.sap.require("hodek.vendorportal.model.jspdf");
    jQuery.sap.require("hodek.vendorportal.model.JsBarcode");
    return Controller.extend("hodek.vendorportal.controller.AsnCreation", {
        onInit() {
            this.baseObjectStoreUrl = "https://hodek-vibration-technologies-pvt-ltd-dev-hodek-eklefds556845713.cfapps.us10-001.hana.ondemand.com/odata/v4/object-store";
            const oRouter = this.getOwnerComponent().getRouter();
            this.oParameters = {
                "$top": 200000
            };
            this.getView().setModel(new JSONModel([]), "files");
            // model for files newly selected but not yet uploaded
            this.getView().setModel(new JSONModel([]), "pendingFiles");
            // this.refreshFiles();
            let that = this;
            this.selectedPOSchAggrVendor = "";
            const oModel = new sap.ui.model.json.JSONModel([]);
            this.getView().setModel(oModel, "AsnItemsModel");
            this.selected_Po_Scheduling_Type = undefined;
            this.selected_Po_Scheduling_Value = undefined;
            this.aPurchaseOrdersData = [];
            this.aUniquePurchaseOrders = [];
            this.aSchAggrementData = [];
            this.aUniqueSchAggrements = [];
            this.aTransporterList = [];
            this.aVendorData = [];
            this.aUniqueVendor = [];
            this.aMaterialData = [];
            this.aUniqueMaterial = [];
            let currentYear = new Date().getFullYear();
            let currentMonth = new Date().getMonth();
            if (currentMonth < 3) {
                currentYear = currentYear - 1;
            }
            this.byId("idRAPO_InvDate").setMaxDate(new Date);
            this.byId("idRAPO_LR_Date").setMaxDate(new Date);
            this.byId("idRAPO_EWAY_Date").setMaxDate(new Date);
            // this.byId("idRAII_InvDate").setMaxDate(new Date);
            // this.byId("idRAII_LR_Date").setMaxDate(new Date);

            this.f4HelpModel = this.getOwnerComponent().getModel("vendorModel");
            //new sap.ui.model.odata.v2.ODataModel("https://my420245.s4hana.cloud.sap/sap/opu/odata/sap/ZSB_INWARDGATEENTRY/");
            //var odataModel = new sap.ui.model.odata.ODataModel("https://my420245.s4hana.cloud.sap/sap/opu/odata/sap/ZSB_INWARDGATEENTRY/"",{user:shadab.hussain@techorbitgroup.com,password:Abap4Ever});
            this.inGateEntryModel = this.getOwnerComponent().getModel("vendorModel");




            setTimeout(function () {
                // that.getPlantData();
                // that.getTransporter();
            }, 300);


            oRouter.getRoute("RouteAsnCreation").attachPatternMatched(this._onRouteMatched, this);

        },
        formatter: Formatter,
        _onRouteMatched: function (oEvent) {
            this.getView().getModel("AsnItemsModel").setProperty("/Results", []);
            this.getView().getModel("pendingFiles").setData([]);
            var sPoNumber = oEvent.getParameter("arguments").po;
            this.purchaseOrder = sPoNumber;
            console.log("Routed PO ID:", sPoNumber);
            const oModel = this.getOwnerComponent().getModel("RoutePoData");
            if (!oModel) {
                this.onNavBack();
                return;
            }
            const oData = oModel.getData();

            const oNow = new Date();

            // Format Date as yyyy-MM-dd
            const sDate = oNow.toISOString().split("T")[0];

            // Format Time as HH:mm:ss
            const sTime = oNow.toTimeString().split(" ")[0];

            // Set values into model
            if (!oData.PoHeader) {
                oData.PoHeader = {};
            }

            oData.PoHeader.Date = sDate;
            oData.PoHeader.Time = sTime;

            oModel.setData(oData);
            this.callThirdScreenPo();
        },
        callThirdScreenPo: function () {
            let aPoData;
            let oSelectedPoItems = this.getOwnerComponent().getModel("SelectedPoItemsModel");
            if (oSelectedPoItems) {
                aPoData = oSelectedPoItems.getProperty("/POItems")
            } else {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("RouteVendorPortal");
                return;
            }

            const aFilters = [];

            // Create OR filters for the array of input combinations
            aPoData.forEach(obj => {
                const oGroupFilter = new sap.ui.model.Filter({
                    filters: [
                        new sap.ui.model.Filter("Plant", sap.ui.model.FilterOperator.EQ, obj.Plant),
                        new sap.ui.model.Filter("PurchaseOrder", sap.ui.model.FilterOperator.EQ, obj.PurchaseOrder),
                        new sap.ui.model.Filter("PurchaseOrderItem", sap.ui.model.FilterOperator.EQ, obj.PurchaseOrderItem)
                    ],
                    and: true
                });
                aFilters.push(oGroupFilter);
            });

            // Final OR filter group
            const oFinalFilter = new sap.ui.model.Filter({
                filters: aFilters,
                and: false
            });

            // Set busy indicator if needed
            this.getView().setBusy(true);

            Models.fetchAsnItems(this, oFinalFilter)
        },
        onNavBack: function () {
            var oHistory = sap.ui.core.routing.History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getOwnerComponent().getRouter().navTo("RoutePurchaseOrder", {
                    po: this.purchaseOrder
                }, true); // replace with actual route
            }
        },
        onNavFirstPage: function () {
            this.getOwnerComponent().getRouter().navTo("RouteVendorPortal", {}, true); // replace with actual route
        },
        onRAPOInvoiceDateChange: function (oEvent) {
            var oDatePicker = oEvent.getSource();
            var sValue = oDatePicker.getValue();
            var oDate = oDatePicker.getDateValue();
            var today = new Date();

            // Remove time from today
            today.setHours(0, 0, 0, 0);

            if (!oDate || oDate > today) {
                // Invalid date or future date
                oDatePicker.setValue(""); // Clear the value
                oDatePicker.setValueState("Error");
                oDatePicker.setValueStateText("Invalid or future dates are not allowed.");
            } else {
                oDatePicker.setValueState("None"); // Clear error state
            }
        },

        onChangeDocInvNo: function (oEvent) {
            let oInput = oEvent.getSource();
            let sValue = oInput.getValue();
            if (sValue === "") {
                return;
            }
            const supplier = this.getOwnerComponent().getModel("RoutePoData").getProperty("/PoHeader/Supplier");
            var aFinalFilter = new sap.ui.model.Filter({
                filters: [
                    new sap.ui.model.Filter("InvoiceNo", sap.ui.model.FilterOperator.EQ, sValue),
                    new sap.ui.model.Filter("Vendor", sap.ui.model.FilterOperator.EQ, supplier)
                ],
                and: true
            });


            this.f4HelpModel.read("/validateInvoice", {
                filters: [aFinalFilter],
                success: function (oResponse) {
                    if (oResponse.results.length > 0) {
                        MessageBox.alert(`Invoice No. ${sValue} is already created`);
                        oInput.setValue();
                    }
                },
                error: function (oError) {
                    oInput.setValue();
                    MessageBox.error("Failed to validate the entered Invoice No.");
                    console.log(oError);
                }
            });
        },

        onChangeRAII_DocInvNo: function (oEvent) {
            let oInput = oEvent.getSource();
            let sValue = oInput.getValue();
            if (sValue === "") {
                return;
            }
            let selectedVendor = this.getView().byId("idRAII_Vendor").getValue();
            if (selectedVendor === "") {
                oInput.setValue();
                MessageToast.show("Select Vendor");
                return;
            }
            var aFinalFilter = new sap.ui.model.Filter({
                filters: [
                    new sap.ui.model.Filter("InvoiceNo", sap.ui.model.FilterOperator.EQ, sValue),
                    new sap.ui.model.Filter("Vendor", sap.ui.model.FilterOperator.EQ, selectedVendor)
                ],
                and: true
            });
            /*var filter1 = new sap.ui.model.Filter({
                path: "InvoiceNo",
                operator: sap.ui.model.FilterOperator.EQ,
                value1: sValue
            });*/

            this.f4HelpModel.read("/GateEntryInvoiceNoF4Help", {
                //filters: [filter1],
                filters: [aFinalFilter],
                success: function (oResponse) {
                    if (oResponse.results.length > 0) {
                        MessageBox.alert(`Invoice No. ${sValue} is already created`);
                        oInput.setValue();
                    }
                },
                error: function (oError) {
                    oInput.setValue();
                    MessageBox.error("Failed to validate the entered Invoice No.");
                    console.log(oError);
                }
            });
        },

        onSelectPlant: function (oEvent) {
            let oValidatedComboBox = oEvent.getSource(),
                sSelectedKey = oValidatedComboBox.getSelectedKey(),
                sValue = oValidatedComboBox.getValue();
            if (!sSelectedKey && sValue) {
                oValidatedComboBox.setValueState(ValueState.Error);
                oValidatedComboBox.setValueStateText("Invalid Value");
            } else {
                oValidatedComboBox.setValueState(ValueState.None);
                this.clearFieldsOnClearPlant();
                this.getPurchaseOrders(sSelectedKey); //load purchase order list
                this.getSchAggrement(sSelectedKey); //load scheduling agreement list
                this.getMaretial(sSelectedKey); //load material/product list
                //this.getChallanData(sSelectedKey);
            }
        },

        clearFieldsOnClearPlant: function () {
            let oView = this.getView();
            let sInwardType = oView.byId("idDropdownInwardType").getSelectedKey();
            if (sInwardType === "ReceiptAgainstPO") {
                /*oView.byId("idDropdownInwardType").setSelectedKey();
                oView.byId("idDropdownInwardType").setValue();
                oView.byId("idRAPO_Date").setValue();
                oView.byId("idRAPO_Time").setValue();
                oView.byId("idRAPO_InvDate").setValue();
                oView.byId("idRAPO_LR_Date").setValue();
                oView.byId("idRAPO_LR_No").setValue();
                oView.byId("idRAPO_EwayNo").setValue();
                oView.byId("idRAPO_Amount").setValue();
                oView.byId("idRAPO_VehicalNo").setValue();
                oView.byId("idRAPO_Trasporter").setValue();
                oView.byId("idPanelRAPO").setVisible(false);*/
                this.selectedPOSchAggrVendor = "";
                this.selected_Po_Scheduling_Type = undefined;
                this.selected_Po_Scheduling_Value = undefined;
                this.maxRAPOAmountAllowed = undefined;
                oView.byId("idRAPO_PO_Order").setValue();
                oView.byId("idDocInvNo").setValue();
                let tModel = new sap.ui.model.json.JSONModel([]);
                oView.byId("idTable_RAPO").setModel(tModel);
                oView.byId("idTable_RAPO").getModel().refresh();

                //reset Amount field value state for RAPO
                let amountInput = this.getView().byId("idRAPO_Amount");
                amountInput.setValueState(sap.ui.core.ValueState.None);
            }
            else if (sInwardType === "ReceiptAsItIs") {
                /*oView.byId("idDropdownInwardType").setSelectedKey();
                oView.byId("idDropdownInwardType").setValue();
                oView.byId("idRAII_Date").setValue();
                oView.byId("idRAII_Time").setValue();
                oView.byId("idRAII_InvDate").setValue();
                oView.byId("idRAII_LR_Date").setValue();
                oView.byId("idRAII_LR_No").setValue();
                oView.byId("idRAII_Challan").setValue();
                oView.byId("idRAII_Vendor").setValue();
                oView.byId("idRAII_EwayNo").setValue();
                oView.byId("idRAII_Amount").setValue();
                oView.byId("idRAII_VehicalNo").setValue();
                oView.byId("idRAII_Trasporter").setValue();
                oView.byId("idPanelRAII").setVisible(false);*/

                //oView.byId("idRAII_DocInvNo").setValue();
                let sModel = new sap.ui.model.json.JSONModel([]);
                oView.byId("idTable_RAII").setModel(sModel);
                this.onAddReceiptAsItIsItem();
            }
        },

        onSelectInwardType: function (oEvent) {
            let oValidatedComboBox = oEvent.getSource(),
                sSelectedKey = oValidatedComboBox.getSelectedKey(),
                sValue = oValidatedComboBox.getValue();

            if (!sSelectedKey && sValue) {
                this.byId("idPanelRAPO").setVisible(false);
                this.byId("idPanelRAII").setVisible(false);
                this.byId("idPanelChallan").setVisible(false);
                oValidatedComboBox.setValueState(ValueState.Error);
                oValidatedComboBox.setValueStateText("Please enter a valid Type!");
            } else {
                let tDate = new Date();
                let oDateFormat = DateFormat.getInstance({
                    pattern: "MMM dd, yyyy"
                });
                let formattedDate = oDateFormat.format(tDate); //`${tDate.getFullYear()}/${String(tDate.getMonth() + 1).padStart(2, '0')}/${String(tDate.getDate()).padStart(2, '0')}`;
                this.byId("idRAPO_Date").setValue(formattedDate);
                let currentTime = `${tDate.getHours()}:${tDate.getMinutes()}:${tDate.getSeconds()}`;
                this.byId("idRAPO_Time").setValue(currentTime);

                oValidatedComboBox.setValueState(ValueState.None);
                if (sValue === "Receipt Against PO") {
                    this.byId("idPanelRAPO").setVisible(true);
                    this.byId("idPanelRAII").setVisible(false);
                    this.byId("idPanelChallan").setVisible(false);
                }
                else if (sValue === "Receipt As It Is") {
                    this.byId("idPanelRAII").setVisible(true);
                    this.byId("idPanelRAPO").setVisible(false);
                    this.byId("idPanelChallan").setVisible(false);

                    /*let tDate = new Date();
                    let oDateFormat = DateFormat.getInstance({
                        pattern: "MMM dd, yyyy"
                    });
                    let formattedDate = oDateFormat.format(tDate); //`${tDate.getFullYear()}/${String(tDate.getMonth() + 1).padStart(2, '0')}/${String(tDate.getDate()).padStart(2, '0')}`;
                    this.byId("idRAII_Date").setValue(formattedDate);
                    let currentTime = `${tDate.getHours()}:${tDate.getMinutes()}:${tDate.getSeconds()}`;
                    this.byId("idRAII_Time").setValue(currentTime);*/

                    let oModel = new sap.ui.model.json.JSONModel([]);
                    this.getView().byId("idTable_RAII").setModel(oModel);
                    this.getVendor(); //load vendor list
                    this.onAddReceiptAsItIsItem(); //add initial record in the Receipt AS It Is Item table
                }
                else {
                    this.byId("idPanelRAPO").setVisible(false);
                    this.byId("idPanelRAII").setVisible(false);
                    this.byId("idPanelChallan").setVisible(true);

                    let tDate = new Date();
                    let formattedDate = `${tDate.getFullYear()}/${String(tDate.getMonth() + 1).padStart(2, '0')}/${String(tDate.getDate()).padStart(2, '0')}`;
                    this.byId("idChallan_Date").setValue(formattedDate);
                    let currentTime = `${tDate.getHours()}:${tDate.getMinutes()}:${tDate.getSeconds()}`;
                    this.byId("idChallan_Time").setValue(currentTime);
                }
            }
        },

        getPlantData: function () {
            let that = this;
            let plantModel = new sap.ui.model.json.JSONModel();
            //let odataModel = new sap.ui.model.odata.v2.ODataModel("NorthwindService/V2/(S(jjlmjbf1oszuuecc251trygy))/OData/OData.svc");
            this.f4HelpModel.read("/PlantF4Help", {
                urlParameters: that.oParameters,
                success: function (oResponse) {
                    //MessageBox.success("Success");
                    plantModel.setData(oResponse.results);
                    that.getView().byId("idDropdownPlant").setModel(plantModel);
                },
                error: function (oError) {
                    MessageBox.error("Failed to load plant list");
                }
            });
        },

        getPurchaseOrders: function (sPlant) {
            let that = this;
            that.aPurchaseOrdersData = [];
            that.aUniquePurchaseOrders = [];

            let filter = new sap.ui.model.Filter({
                path: "Plant",
                operator: sap.ui.model.FilterOperator.EQ,
                value1: sPlant
            });
            this.getView().setBusy(true);
            //this.f4HelpModel.read(`/ItemforPo?$filter=Plant eq '${sPlant}'&$top=1000`, {
            this.f4HelpModel.read("/ItemforPo", {
                filters: [filter],
                urlParameters: that.oParameters,  // The top limit
                success: function (oResponse) {
                    that.getView().setBusy(false);
                    that.aPurchaseOrdersData = oResponse.results;
                    const key = 'PurchaseOrder';
                    that.aUniquePurchaseOrders = [...new Map(oResponse.results.map(item =>
                        [item[key], item])).values()];
                },
                error: function (oError) {
                    that.getView().setBusy(false);
                    MessageBox.error("Failed to load PO Data");
                    console.log(oError);
                }
            });

            /*that.aUniquePurchaseOrders = [
                {
                    "PurchaseOrder": "410000000",
                    "PurchaseOrderItem": "10",
                    "Material": "10000002",
                    "PurchaseOrderItemText": "READ WASHER",
                    "Plant": "1100",
                    "BaseUnit": "KG",
                    "OrderQuantity": "10.000",
                    "Ponumber1": "",
                    "Itemno1": "0",
                    "Material1": "",
                    "Materialdesc1": "",
                    "Quantity1": "0.00",
                    "postedquantity": "0.00",
                    "final_qty": "10.00"
                },
                {
                    "PurchaseOrder": "410000001",
                    "PurchaseOrderItem": "10",
                    "Material": "10000055",
                    "PurchaseOrderItemText": "Raw Material Test (QC)",
                    "Plant": "1100",
                    "BaseUnit": "PC",
                    "OrderQuantity": "1000",
                    "Ponumber1": "",
                    "Itemno1": "0",
                    "Material1": "",
                    "Materialdesc1": "",
                    "Quantity1": "0",
                    "postedquantity": "0",
                    "final_qty": "1000.00"
                },
                {
                    "PurchaseOrder": "410000002",
                    "PurchaseOrderItem": "10",
                    "Material": "10000056",
                    "PurchaseOrderItemText": "Raw Material Test (QC1)",
                    "Plant": "1100",
                    "BaseUnit": "PC",
                    "OrderQuantity": "1000",
                    "Ponumber1": "",
                    "Itemno1": "0",
                    "Material1": "",
                    "Materialdesc1": "",
                    "Quantity1": "0",
                    "postedquantity": "0",
                    "final_qty": "1000.00"
                }
            ];
            that.aPurchaseOrdersData = that.aUniquePurchaseOrders;*/
        },

        getSchAggrement: function (sPlant) {
            let that = this;
            that.aSchAggrementData = [];
            that.aUniqueSchAggrements = [];

            let filter = new sap.ui.model.Filter({
                path: "Plant",
                operator: sap.ui.model.FilterOperator.EQ,
                value1: sPlant
            });
            // this.f4HelpModel.read(`/ItemforSchAgr?$filter=Plant eq '${sPlant}'`, {
            this.f4HelpModel.read("/ItemforSchAgr", {
                filters: [filter],
                urlParameters: that.oParameters,
                success: function (oResponse) {
                    that.aSchAggrementData = oResponse.results;
                    const key = 'SchedulingAgreement';
                    that.aUniqueSchAggrements = [...new Map(oResponse.results.map(item =>
                        [item[key], item])).values()];
                },
                error: function (oError) {
                    MessageBox.error("Failed to load Scheduling Aggrement Data");
                    console.log(oError);
                }
            });

            /*that.aUniqueSchAggrements = [
               {
                   "SchedulingAgreement": "5500000000",
                   "SchedulingAgreementItem": "10",
                   "PurchasingDocumentItemText": "SEAMLESS TUBE SAE4130 36.5x6x788 MPL",
                   "Material": "10000007",
                   "Plant": "1100",
                   "OrderQuantityUnit": "M",
                   "TargetQuantity": "10000.000",
                   "Ponumber1": "",
                   "Itemno1": "0",
                   "Material1": "",
                   "Materialdesc1": "",
                   "Quantity1": "0.00",
                   "postedquantity": "0.00",
                   "final_qty": "10000.00"
               },
               {
                   "SchedulingAgreement": "5500000003",
                   "SchedulingAgreementItem": "10",
                   "PurchasingDocumentItemText": "SEAMLESS TUBE SAE4130 36.5x6x788 MPL",
                   "Material": "10000007",
                   "Plant": "1100",
                   "OrderQuantityUnit": "M",
                   "TargetQuantity": "70000.000",
                   "Ponumber1": "",
                   "Itemno1": "0",
                   "Material1": "",
                   "Materialdesc1": "",
                   "Quantity1": "0.00",
                   "postedquantity": "0.00",
                   "final_qty": "70000.00"
               },
               {
                   "SchedulingAgreement": "5500000004",
                   "SchedulingAgreementItem": "10",
                   "PurchasingDocumentItemText": "SEAMLESS TUBE SAE4130 36.5x6x788 mm",
                   "Material": "31000043",
                   "Plant": "1100",
                   "OrderQuantityUnit": "EA",
                   "TargetQuantity": "10",
                   "Ponumber1": "",
                   "Itemno1": "0",
                   "Material1": "",
                   "Materialdesc1": "",
                   "Quantity1": "0",
                   "postedquantity": "0",
                   "final_qty": "10.00"
               }
           ];
           that.aSchAggrementData = that.aUniqueSchAggrements;*/

        },

        getVendor: function (sPlant) {
            let that = this;
            that.aVendorData = [];
            that.aUniqueVendor = [];
            /*let filter = new sap.ui.model.Filter({
                path: "Plant",
                operator: sap.ui.model.FilterOperator.EQ,
                value1: sPlant
            });*/

            this.f4HelpModel.read("/SupplierVh", {
                //filters: [filter],
                urlParameters: that.oParameters,
                success: function (oResponse) {
                    that.aVendorData = oResponse.results;
                    /*const key = 'Supplier';
                    that.aUniqueVendor = [...new Map(oResponse.results.map(item =>
                        [item[key], item])).values()];*/
                },
                error: function (oError) {
                    MessageBox.error("Failed to load Vendor List");
                    console.log(oError);
                }
            });
        },

        getMaretial: function (sPlant) {
            let that = this;
            that.aMaterialData = [];
            that.aUniqueMaterial = [];
            let filter = new sap.ui.model.Filter({
                path: "Plant",
                operator: sap.ui.model.FilterOperator.EQ,
                value1: sPlant
            });
            this.f4HelpModel.read("/ProductF4Help", {
                filters: [filter],
                urlParameters: that.oParameters,
                success: function (oResponse) {
                    that.aMaterialData = oResponse.results;
                    const key = 'Product';
                    that.aUniqueMaterial = [...new Map(oResponse.results.map(item =>
                        [item[key], item])).values()];
                },
                error: function (oError) {
                    MessageBox.error("Failed to load Material List");
                    console.log(oError);
                }
            });
        },

        getChallanData: function (sPlant) {
            let that = this;
            let filter1 = new sap.ui.model.Filter({
                path: "Plant",
                operator: sap.ui.model.FilterOperator.EQ,
                value1: sPlant
            });
            this.challanModel.read("/YY1_ChallanNoF4Help", {
                filters: [filter1],
                urlParameters: that.oParameters,
                success: function (oResponse) {
                    that.aChallanListData = oResponse.results;
                    const key = 'IN_SubcontrgDocNmbr';
                    that.uniqueChallanList = [...new Map(oResponse.results.map(item =>
                        [item[key], item])).values()];
                },
                error: function (oError) {
                    MessageBox.error("Failed to load the Challan data");
                    console.log(oError);
                }
            });
        },

        POValueHelp: function (oEvent) {
            let that = this;
            let oInput = oEvent.getSource();
            let oView = this.getView();
            let sPlant = oView.byId("idDropdownPlant").getSelectedKey();
            if (!sPlant) {
                MessageToast.show("Select a Plant");
                return;
            }

            // Open the fragment for value help
            if (!this._oValueHelpDialog) {
                Fragment.load({
                    name: "com.scp.fiori.inwardgateentry.fragment.PurchaseOrderDialog",
                    controller: this
                }).then(function (oDialog) {
                    this._oValueHelpDialog = oDialog;
                    oView.addDependent(oDialog);
                    oDialog.open();
                }.bind(this));
            } else {
                this._oValueHelpDialog.open();
            }
            setTimeout(function () {
                let jModel = new sap.ui.model.json.JSONModel();
                sap.ui.getCore().byId("valueHelpDialog").setModel(jModel);
                // Fetch data for the lists (filter1Items, filter2Items)
                let aPurchaseOrderList = that.aUniquePurchaseOrders;
                sap.ui.getCore().byId("valueHelpDialog").getModel().setProperty("/filter1Items", aPurchaseOrderList);

                let aSchedulingAggreList = that.aUniqueSchAggrements;
                sap.ui.getCore().byId("valueHelpDialog").getModel().setProperty("/filter2Items", aSchedulingAggreList);
            }, 400);
        },
        onSearchPoList: function (oEvent) {
            var oList = oEvent.getSource().getParent().getContent()[1]; // Getting the corresponding list for the search field
            var sValue = oEvent.getParameter("newValue");

            var oBinding = oList.getBinding("items");
            let oFilter = new sap.ui.model.Filter({
                filters: [
                    new sap.ui.model.Filter("PurchaseOrder", sap.ui.model.FilterOperator.Contains, sValue),
                    new sap.ui.model.Filter("PurchaseOrderItemText", sap.ui.model.FilterOperator.Contains, sValue),
                    new sap.ui.model.Filter("SchedulingAgreement", sap.ui.model.FilterOperator.Contains, sValue),
                    new sap.ui.model.Filter("PurchasingDocumentItemText", sap.ui.model.FilterOperator.Contains, sValue)
                ]
            });
            //var oFilter = new sap.ui.model.Filter("Name", sap.ui.model.FilterOperator.Contains, sQuery);

            oBinding.filter(oFilter);
        },

        //On selecting Purchase Order/Scheduling Aggrement
        onListItemPress: function (oEvent) {
            let that = this;
            this.maxRAPOAmountAllowed = undefined;
            var oItem = oEvent.getSource();
            var selectedItem = oItem.getBindingContext().getObject();
            let selectedValue = "",
                selectedKey = "";
            if (selectedItem.PurchaseOrder) {
                selectedValue = selectedItem.PurchaseOrder;
                selectedKey = "PurchaseOrder";
                this.selected_Po_Scheduling_Type = "PurchaseOrder";
                this.selected_Po_Scheduling_Value = selectedItem.PurchaseOrder;
                this.selectedPOSchAggrVendor = selectedItem.Supplier; //get the selected PO vendor
            }
            else if (selectedItem.SchedulingAgreement) {
                selectedValue = selectedItem.SchedulingAgreement;
                selectedKey = "SchedulingAgreement";
                this.selected_Po_Scheduling_Type = "SchedulingAgreement";
                this.selected_Po_Scheduling_Value = selectedItem.SchedulingAgreement;
                this.selectedPOSchAggrVendor = selectedItem.Supplier; // get the selected scheduling Aggrement vendor
            }
            // Set the selected value in the input field
            var oInput = this.byId("idRAPO_PO_Order");
            oInput.setValue(selectedValue);
            this.getView().byId("idDocInvNo").setValue(); //clear invoice number on selecting po/scheduling aggrement

            //this.setPOTableData(selectedKey, selectedValue);
            let oModel = new sap.ui.model.json.JSONModel([]);
            this.getView().byId("idTable_RAPO").setModel(oModel);
            this.onAddReceiptAsPOTableItem();

            // Close the dialog
            this._oValueHelpDialog.close();

            //reset Amount field value state for RAPO
            let amountInput = that.getView().byId("idRAPO_Amount");
            amountInput.setValueState(sap.ui.core.ValueState.None);
        },

        onDialogClose: function () {
            this._oValueHelpDialog.close();
        },




        // onChangeRAPOItemQuantity: function (oEvent) {
        //     let oInput = oEvent.getSource();
        //     let value = oInput.getValue();
        //     let binding = oInput.getBindingContext("AsnItemsModel").getObject();
        //     if (value === "") {
        //         binding.AvailableQuantity = value; //update entered Qty into available Quantity field
        //         let amountInput = this.getView().byId("idRAPO_Amount");
        //         amountInput.setValueState(sap.ui.core.ValueState.None);
        //         return;
        //     }
        //     if (binding.Material === "") {
        //         MessageToast.show("Select Material");
        //         oInput.setValue();
        //         binding.AvailableQuantity = ""; //update entered Qty into available Quantity field
        //         let amountInput = this.getView().byId("idRAPO_Amount");
        //         amountInput.setValueState(sap.ui.core.ValueState.None);
        //         return;
        //     }
        //     let maxValue = parseFloat(binding.Quantity1) - parseFloat(binding.postedquantity); // Set the maximum value you want to allow

        //     // Allow only numbers and check if the value exceeds maxValue
        //     if (isNaN(value) || value > maxValue) {
        //         // Invalid input, revert to previous value or show an error
        //         oInput.setValueState(sap.ui.core.ValueState.Error);
        //         oInput.setValueStateText("Enter a valid number which should be less than or equals to " + maxValue);
        //         oInput.setValue();
        //         binding.AvailableQuantity = ""; //update entered Qty into available Quantity field
        //         //reset Amount field value state for RAPO
        //         let amountInput = this.getView().byId("idRAPO_Amount");
        //         amountInput.setValueState(sap.ui.core.ValueState.None);
        //     } else {
        //         binding.EnteredQuantity = value;
        //         binding.AvailableQuantity = value; //update entered Qty into available Quantity field
        //         // Valid input, clear error state
        //         oInput.setValueState(sap.ui.core.ValueState.None);
        //         this.calculateMaxAmoutValue_RAPO(value);
        //     }
        // },

        onChangeRAPOItemQuantity: function (oEvent) {
            this.errorQuantity = false;
            let oInput = oEvent.getSource();
            let sPath = oInput.getBindingContext("AsnItemsModel").getPath();
            let oModel = this.getView().getModel("AsnItemsModel");
            let oItem = oModel.getProperty(sPath);

            let orderQuantity = parseFloat(oItem.OrderQuantity) || 0;
            let postedQuantity = parseFloat(oItem.totalPostedQuantity) || 0;
            let enteredQuantity = parseFloat(oItem.EnteredQuantity) || 0;

            // Clear previous value state
            oInput.setValueState(sap.ui.core.ValueState.None);
            oInput.setValueStateText("");

            let totalQuantity = postedQuantity + enteredQuantity;

            if (totalQuantity <= orderQuantity) {
                // ✅ Valid case — update postedQuantity
                // oModel.setProperty(sPath + "/Postedquantity", totalQuantity.toFixed(2));
            } else {
                // ❌ Invalid case — set error state and message
                let allowedQty = orderQuantity - postedQuantity;
                oInput.setValueState(sap.ui.core.ValueState.Error);
                this.errorQuantity = true;
                oInput.setValueStateText(
                    `Enter a valid number which should be less than or equals to ${(Math.round(allowedQty * 100) / 100).toFixed(2)}`
                );
            }
        },

        calculateMaxAmoutValue_RAPO: function (enteredQty) {
            let poTable = this.getView().byId("idTable_RAPO");
            let poTableData = poTable.getModel("AsnItemsModel").getProperty("/Results");
            this.maxRAPOAmountAllowed = 0;
            if (this.selected_Po_Scheduling_Type === "PurchaseOrder") {
                let maxAmountForItem = 0;
                poTableData.forEach(item => {
                    let val1 = (item.EffectiveAmount / item.Quantity);
                    if (!enteredQty) {
                        maxAmountForItem = maxAmountForItem + (val1 * item.AvailableQuantity);
                    }
                    else {
                        maxAmountForItem = maxAmountForItem + (val1 * item.EnteredQuantity);
                    }
                });
                this.maxRAPOAmountAllowed = Math.ceil(maxAmountForItem);
            }
            else { //this.selected_Po_Scheduling_Type = "SchedulingAgreement"
                let maxAmountForItem = 0;
                poTableData.forEach(item => {
                    if (!enteredQty) {
                        maxAmountForItem = maxAmountForItem + (item.NetPriceAmount * item.AvailableQuantity);
                    }
                    else {
                        maxAmountForItem = maxAmountForItem + (item.NetPriceAmount * item.EnteredQuantity);
                    }
                });
                this.maxRAPOAmountAllowed = Math.ceil(maxAmountForItem);
            }
            let amountInput = this.getView().byId("idRAPO_Amount");
            if (amountInput.getValue() === "") {
                amountInput.setValueState(sap.ui.core.ValueState.None);
                return;
            }
            let enteredAmount = parseFloat(amountInput.getValue());
            if (enteredAmount > (this.maxRAPOAmountAllowed + 5) || enteredAmount < (this.maxRAPOAmountAllowed - 5)) {
                amountInput.setValueState(sap.ui.core.ValueState.Error);
                amountInput.setValueStateText(`Maximum Amount alloweded is ${this.maxRAPOAmountAllowed + 5} \n Minimum Amount alloweded is ${this.maxRAPOAmountAllowed - 5}`);
                amountInput.setValue();
            }
            else {
                amountInput.setValueState(sap.ui.core.ValueState.None);
            }
        },

        // onChangeRAPOAmount: function (oEvent) {
        //     let oInput = oEvent.getSource();
        //     let enteredAmount = oInput.getValue();
        //     if (isNaN(enteredAmount)) {
        //         oInput.setValueState(sap.ui.core.ValueState.Error);
        //         oInput.setValueStateText("Enter a valid number");
        //         oInput.setValue();
        //     } else if (this.maxRAPOAmountAllowed !== undefined) {
        //         //if (parseFloat(enteredAmount) > this.maxRAPOAmountAllowed) {
        //         if ((parseFloat(enteredAmount) > (this.maxRAPOAmountAllowed + 5)) || (parseFloat(enteredAmount) < (this.maxRAPOAmountAllowed - 5))) {
        //             let errMsg = `Maximum Amount alloweded is ${this.maxRAPOAmountAllowed + 5} \n Minimun Amount alloweded is ${this.maxRAPOAmountAllowed - 5}`;
        //             oInput.setValueState(sap.ui.core.ValueState.Error);
        //             oInput.setValueStateText(errMsg);
        //             oInput.setValue();
        //             return;
        //         }
        //         oInput.setValueState(sap.ui.core.ValueState.None);
        //     }
        //     else {
        //         oInput.setValueState(sap.ui.core.ValueState.None);
        //     }
        // },

        onDeleteReceiptAsPoItem: function (oEvent) {
            let that = this;
            let RAIITable = this.getView().byId("idTable_RAPO");
            let RAIITableData = RAIITable.getModel().getData();
            let sPath = oEvent.getSource().getBindingContext().getPath(); //.split("/")[1];
            let iIndex = parseInt(sPath.substring(sPath.lastIndexOf("/") + 1), 10);
            RAIITableData.splice(iIndex, 1);
            RAIITable.getModel().refresh();
            setTimeout(function () {
                that.calculateMaxAmoutValue_RAPO();
            }, 200);
        },

        /*   END   */

        onChangeAmount: function (oEvent) {
            let oInput = oEvent.getSource();
            let value = oInput.getValue();
            if (isNaN(value)) {
                oInput.setValueState(sap.ui.core.ValueState.Error);
                oInput.setValueStateText("Enter a valid number");
                oInput.setValue();
            } else {
                oInput.setValueState(sap.ui.core.ValueState.None);
            }
        },

        vendorValueHelp: function (oEvent) {
            try {
                let that = this;
                let selectedInput = oEvent.getSource();
                let oCustomListItem = new sap.m.StandardListItem({
                    active: true,
                    title: "{Supplier}",
                    description: "{SupplierName}"
                });

                let oSelectDialog = new sap.m.SelectDialog({
                    title: "Select Vendor",
                    noDataText: "No Data",
                    width: "50%",
                    growing: true,
                    growingThreshold: 12,
                    growingScrollToLoad: true,
                    confirm: function (oEvent) {
                        let aContexts = oEvent.getParameter("selectedContexts");
                        if (aContexts.length) {
                            let selectedValue = aContexts.map(function (oContext) {
                                return oContext.getObject();
                            });
                            selectedInput.setValue(selectedValue[0].Supplier);
                            that.getView().byId("idRAII_DocInvNo").setValue(); //clear Invoice number on selecting vendor
                        }
                    },
                    liveChange: function (oEvent) {
                        let sValue = oEvent.getParameter("value");
                        let custFilter = new sap.ui.model.Filter({
                            filters: [
                                new sap.ui.model.Filter("Supplier", sap.ui.model.FilterOperator.Contains, sValue),
                                new sap.ui.model.Filter("SupplierName", sap.ui.model.FilterOperator.Contains, sValue)
                            ]
                        });
                        let oBinding = oEvent.getSource().getBinding("items");
                        oBinding.filter([custFilter]);
                    }
                });
                let oModel = new sap.ui.model.json.JSONModel();
                oModel.setData({
                    modelData: that.aVendorData
                });
                oSelectDialog.setModel(oModel);
                oSelectDialog.bindAggregation("items", "/modelData", oCustomListItem);
                oSelectDialog.open();
            } catch (e) {
                console.log(e);
            }
        },

        getTransporter: function () {
            this.aTransporterList = [
                { Transporter: "CHOUDHARY ROADLINES" },
                { Transporter: "ARVIND ROADLINES" },
                { Transporter: "BHAGWAT MUTTE" },
                { Transporter: "BHAGWAT TRANSPORT SERVICES" },
                { Transporter: "METEORIC LOGISTICS PVT. LTD" },
                { Transporter: "SANGAM LOGISTIC SERVICES" },
                { Transporter: "CHANDRAKANT MUTHE" },
                { Transporter: "G R LOGISTICS" },
                { Transporter: "G S TRANSPORT CORPORATION" },
                { Transporter: "ARCHANA ROADLINES CORPORTION" },
                { Transporter: "VISHWAMBHAR ARJUN WAGHMARE" },
                { Transporter: "GANESH WANKHEDE" },
                { Transporter: "VRL LOGISTICS LTD" },
                { Transporter: "HARSHADA CRANE SERVICES" }
            ];

            /*let that = this;
            this.f4HelpModel.read("/TransporterF4Help", {
                urlParameters: that.oParameters,
                success: function (oResponse) {
                    that.aTransporterList = oResponse.results;
                },
                error: function (oError) {
                    MessageBox.error("Failed to load transporter list");
                    console.log(oError);
                }
            });*/
        },

        transporterValueHelp: function (oEvent) {
            try {
                let that = this;
                let selectedInput = oEvent.getSource();
                let oCustomListItem = new sap.m.StandardListItem({
                    active: true,
                    title: "{Transporter}"
                });
                /*let oCustomListItem = new sap.m.CustomListItem({
                    active: true,
                    content: [
                        new sap.m.HBox({
                            items: [
                                new sap.m.Label({
                                    text: "{Transporter}"
                                }).addStyleClass("sapMH4FontSize")
                            ]
                        }).addStyleClass("sapUiSmallMargin"),
                    ]
                });*/

                let oSelectDialog = new sap.m.SelectDialog({
                    title: "Select Transporter",
                    noDataText: "No Data",
                    width: "50%",
                    growing: true,
                    growingThreshold: 12,
                    growingScrollToLoad: true,
                    confirm: function (oEvent) {
                        let aContexts = oEvent.getParameter("selectedContexts");
                        if (aContexts.length) {
                            let selectedValue = aContexts.map(function (oContext) {
                                return oContext.getObject();
                            });
                            selectedInput.setValue(selectedValue[0].Transporter);
                        }
                    },
                    liveChange: function (oEvent) {
                        let sValue = oEvent.getParameter("value");
                        var oFilter = new sap.ui.model.Filter("Transporter", sap.ui.model.FilterOperator.Contains, sValue);
                        /*let oFilter = new Filter({
                            filters: [
                                new sap.ui.model.Filter("Transporter", sap.ui.model.FilterOperator.Contains, sValue)
                                new sap.ui.model.Filter("Transporter_Description", sap.ui.model.FilterOperator.Contains, sValue)
                            ]
                        });*/

                        let oBinding = oEvent.getSource().getBinding("items");
                        oBinding.filter(oFilter);
                        //oBinding.filter([oFilter]);
                    }
                });
                let oModel = new sap.ui.model.json.JSONModel();
                oModel.setData({
                    modelData: this.aTransporterList //view.getModel("searchModel").getData().searchModel
                });
                oSelectDialog.setModel(oModel);
                oSelectDialog.bindAggregation("items", "/modelData", oCustomListItem);
                oSelectDialog.open();
            } catch (e) {
                that.getView().setBusy(false);
            }
        },

        materialValueHelp: function (oEvent) {
            try {
                let that = this;
                let selectedInput = oEvent.getSource();
                let oCustomListItem = new sap.m.StandardListItem({
                    active: true,
                    title: "{Product}",
                    description: "{ProductName}"
                });

                let oSelectDialog = new sap.m.SelectDialog({
                    title: "Select Material",
                    noDataText: "No Data",
                    width: "50%",
                    growing: true,
                    growingThreshold: 12,
                    growingScrollToLoad: true,
                    confirm: function (oEvent) {
                        let aContexts = oEvent.getParameter("selectedContexts");
                        if (aContexts.length) {
                            let selectedValue = aContexts.map(function (oContext) {
                                return oContext.getObject();
                            });
                            selectedInput.setValue(selectedValue[0].Product);
                            selectedInput.getBindingContext().getObject().ProductName = selectedValue[0].ProductName;
                            selectedInput.getBindingContext().getObject().Unit = selectedValue[0].Unit;
                        }
                    },
                    liveChange: function (oEvent) {
                        let sValue = oEvent.getParameter("value");
                        let custFilter = new sap.ui.model.Filter({
                            filters: [
                                new sap.ui.model.Filter("Product", sap.ui.model.FilterOperator.Contains, sValue),
                                new sap.ui.model.Filter("ProductName", sap.ui.model.FilterOperator.Contains, sValue)
                            ]
                        });
                        let oBinding = oEvent.getSource().getBinding("items");
                        oBinding.filter([custFilter]);
                    }
                });
                let oModel = new sap.ui.model.json.JSONModel();
                oModel.setData({
                    modelData: that.aMaterialData
                });
                oSelectDialog.setModel(oModel);
                oSelectDialog.bindAggregation("items", "/modelData", oCustomListItem);
                oSelectDialog.open();
            } catch (e) {
                console.log(e);
            }
        },

        challanValueHelp: function (oEvent) {
            try {
                let that = this;
                let selectedInput = oEvent.getSource();
                let sPlant = this.getView().byId("idDropdownPlant").getSelectedKey();
                if (!sPlant) {
                    MessageToast.show("Select a Plant");
                    return;
                }
                let oCustomListItem = new sap.m.StandardListItem({
                    active: true,
                    title: "{IN_SubcontrgDocNmbr}",
                    description: "{ProductName}"
                });

                let oSelectDialog = new sap.m.SelectDialog({
                    title: "Select Challan",
                    noDataText: "No Data",
                    width: "50%",
                    growing: true,
                    growingThreshold: 12,
                    growingScrollToLoad: true,
                    confirm: function (oEvent) {
                        let aContexts = oEvent.getParameter("selectedContexts");
                        if (aContexts.length) {
                            let selectedValue = aContexts.map(function (oContext) {
                                return oContext.getObject();
                            });
                            selectedInput.setValue(selectedValue[0].IN_SubcontrgDocNmbr);
                            that.getView().byId("idRAII_Vendor").setValue(selectedValue[0].ActiveSupplier); //set vendor value

                            //Get Item data based om selected Challan No
                            that.getChallanItemData(selectedValue[0].IN_SubcontrgDocNmbr);
                        }
                    },
                    liveChange: function (oEvent) {
                        let sValue = oEvent.getParameter("value");
                        //var oFilter = new sap.ui.model.Filter("IN_SubcontrgDocNmbr", sap.ui.model.FilterOperator.Contains, sValue);
                        let oFilter = new sap.ui.model.FilterFilter({
                            filters: [
                                new sap.ui.model.Filter("IN_SubcontrgDocNmbr", sap.ui.model.FilterOperator.Contains, sValue),
                                new sap.ui.model.Filter("ProductName", sap.ui.model.FilterOperator.Contains, sValue)
                            ]
                        });

                        let oBinding = oEvent.getSource().getBinding("items");
                        //oBinding.filter(oFilter);
                        oBinding.filter([oFilter]);
                    }
                });
                let oModel = new sap.ui.model.json.JSONModel();
                oModel.setData({
                    modelData: this.uniqueChallanList
                });
                oSelectDialog.setModel(oModel);
                oSelectDialog.bindAggregation("items", "/modelData", oCustomListItem);
                oSelectDialog.open();
            } catch (e) {
                that.getView().setBusy(false);
            }
        },

        getChallanItemData: function (sChallanNo) {
            let that = this;
            this.getView().setBusy(true);
            let filter = new sap.ui.model.Filter({
                path: "Ponumber",
                operator: sap.ui.model.FilterOperator.EQ,
                value1: sChallanNo
            });
            // this.f4HelpModel.read(`/InwardItemDet?$filter=Ponumber eq '${sChallanNo}'`, {
            this.f4HelpModel.read("/InwardItemDet", {
                filters: [filter],
                urlParameters: that.oParameters,
                success: function (oResponse) {
                    that.getView().setBusy(false);
                    let RAIITableData = [];
                    if (oResponse.results.length > 0) {
                        RAIITableData = oResponse.results.filter(item => {
                            item.AvailableQuantity = parseFloat(item.Quantity) - parseFloat(item.Postedquantity);
                            return item;
                        });
                    }
                    else {
                        RAIITableData = that.aChallanListData.filter(item => {
                            if (item.IN_SubcontrgDocNmbr === sChallanNo) {
                                item.Itemno = item.MaterialDocumentItem;
                                item.Materialdesc = item.ProductName;
                                item.AvailableQuantity = parseFloat(item.Quantity);
                                return items;
                            }
                        });
                    }
                    that.setRAIITableData(RAIITableData);
                },
                error: function (oError) {
                    that.getView().setBusy(false);
                    MessageBox.error("Failed to load Challan Item data");
                    console.log(oError);
                }
            });
        },

        setRAIITableData: function (RAIITableData) {
            let oModel = new sap.ui.model.json.JSONModel(RAIITableData);
            this.getView().byId("idTable_RAII").setModel(oModel);
        },

        onAddReceiptAsItIsItem: function () {
            let RAIITable = this.getView().byId("idTable_RAII");
            let RAIITableData = RAIITable.getModel().getData();
            let tData = {};
            if (RAIITableData.length === 0) {
                tData = {
                    Itemno: "10",
                    Product: "",
                    ProductName: "",
                    AvailableQuantity: "",
                    Unit: ""
                };
            }
            else {
                let maxItemNum = Math.max(...RAIITableData.map(item => parseInt(item.Itemno)));
                tData = {
                    Itemno: (maxItemNum + 10).toString(),
                    Product: "",
                    ProductName: "",
                    AvailableQuantity: "",
                    Unit: ""
                };
            }
            RAIITableData.push(tData);
            RAIITable.getModel().refresh();
        },

        onDeleteReceiptAsItIsItem: function (oEvent) {
            let RAIITable = this.getView().byId("idTable_RAII");
            let RAIITableData = RAIITable.getModel().getData();
            let sPath = oEvent.getSource().getBindingContext().getPath(); //.split("/")[1];
            let iIndex = parseInt(sPath.substring(sPath.lastIndexOf("/") + 1), 10);
            RAIITableData.splice(iIndex, 1);
            RAIITable.getModel().refresh();
        },

        onSave: function () {
            let that = this;
            let oView = this.getView();
            let Plant = oView.byId("idDropdownPlant").getValue();
            if (this.checkQuantityInputErrors()) {
                sap.m.MessageToast.show("Please correct quantity errors before saving.");
                return;
            }
            const pending = this.getView().getModel("pendingFiles").getData();

            // Validation: must have at least 1 file
            if (pending.length === 0) {
                MessageToast.show("Please attach at least one file before saving.");
                return;
            }
            MessageBox.confirm("Are you sure you want to save this ASN?", {
                title: "Confirm Save",
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                emphasizedAction: MessageBox.Action.YES,
                onClose: function (oAction) {
                    if (oAction !== MessageBox.Action.YES) {
                        return; // Exit if user cancels
                    }
                    let oDateFormat = DateFormat.getInstance({
                        pattern: "yyyy-MM-dd'T'00:00:00"
                    });
                    let SystemDate = oDateFormat.format(new Date(oView.byId("idRAPO_Date").getValue())),
                        time = oView.byId("idRAPO_Time").getValue().split(":"),
                        hours = time[0].length === 1 ? ('0' + time[0]) : time[0],
                        SystemTime = `PT${hours}H${time[1]}M${time[1]}S`;

                    let InvoiceNo = that.getView().byId("idDocInvNo").getValue();
                    let InvoiceDate = oDateFormat.format(oView.byId("idRAPO_InvDate").getDateValue()),
                        Lrnumber = oView.byId("idRAPO_LR_No").getValue(),
                        Lrdate = oDateFormat.format(oView.byId("idRAPO_LR_Date").getDateValue()),
                        EwayDate = oDateFormat.format(oView.byId("idRAPO_EWAY_Date").getDateValue()),
                        Ponumber = oView.byId("idRAPO_PO_Order").getValue(),
                        Vendor = oView.byId("idSupplier").getText(),
                        Ewayno = oView.byId("idRAPO_EwayNo").getValue(),
                        Amount = oView.byId("idRAPO_Amount").getValue(),
                        Vehicleno = oView.byId("idRAPO_VehicalNo").getValue(),
                        purchaseOrder = oView.byId("idRAPO_PO_Order").getValue(),
                        supplierName = oView.byId("idSupplierName").getText(),
                        Transporter = oView.byId("idRAPO_Trasporter").getValue();
                    if (InvoiceNo === "" || (!InvoiceDate) || Ponumber === "" || Ewayno === "" || Amount === "" || Vehicleno === "" || Transporter === "") {
                        MessageToast.show("Fill all mandatory fields");
                        return;
                    }
                    if (that.errorQuantity) {
                        MessageToast.show("Enter a valid Quantity");
                        return;
                    }
                    let isQuantityEntered = true;
                    var itemData = [];
                    that.getView().byId("idTable_RAPO").getModel("AsnItemsModel").getProperty("/Results").filter(item => {
                        if (!item.EnteredQuantity) {
                            isQuantityEntered = false;
                        }
                        let toPostedQuanity = parseFloat(item.postedquantity) + parseFloat(item.EnteredQuantity);

                        let obj = {
                            "Ponumber": Ponumber,
                            "LineItem": item.PurchaseOrderItem,
                            "Material": item.Material,
                            "Materialdesc": item.PurchaseOrderItemText,
                            "Quantity": parseFloat(item.OrderQuantity).toFixed(2),
                            "Postedquantity": parseFloat(item.EnteredQuantity).toFixed(2),
                            "Uom": item.BaseUnit
                        };
                        itemData.push(obj);
                    });
                    if (!isQuantityEntered) {
                        MessageToast.show("Enter Item Quantity");
                        return;
                    }
                    const hasZeroPostedQty = itemData.some(obj => parseFloat(obj.Postedquantity) === 0);

                    if (hasZeroPostedQty) {
                        MessageToast.show("Quantity cannot be zero");
                        return;
                    }
                    let payload = {
                        "AsnNo": "",
                        "GateEntryId": "",
                        "Inwardtype": "RECPO",
                        "InvoiceNo": InvoiceNo,
                        "Ponumber": purchaseOrder,
                        "Plant": Plant,
                        "SystemDate": SystemDate,
                        "SystemTime": SystemTime,
                        "InvoiceDate": InvoiceDate, //"2024-12-29T00:00:00",
                        "Lrdate": (Lrdate !== "" ? Lrdate : null), //"2024-12-29T00:00:00",
                        "Lrnumber": Lrnumber,
                        "Vendor": Vendor,
                        "Ewayno": Ewayno,
                        "EwaybillDate": (EwayDate !== "" ? EwayDate : null),
                        "Amount": parseFloat(Amount).toFixed(2),
                        "Vehicleno": Vehicleno,
                        "Transporter": Transporter,
                        "Status": "01",
                        "Vendorname": supplierName,
                        "Sourceappvp": "X",
                        "to_Item": itemData
                    };

                    that.getView().setBusy(true);
                    that.inGateEntryModel.create("/InwardGateHeader", payload, {
                        method: "POST",
                        success: function (oData, oResponse) {
                            that.getView().setBusy(false);
                            let qrDataToPrintQRCode = oResponse.data;
                            let qrData = oResponse.data;
                            let gateEntryNo = qrData.AsnNo;
                            that.onSaveFiles(qrData.AsnNo);
                            console.log(oResponse);
                            let oTable = that.getView().byId("idTable_RAPO");
                            let aItems = oTable.getModel("AsnItemsModel").getProperty("/Results") || [];
                            // 3️⃣ Prepare array of POST promises
                            var dialog = new Dialog("idPrintQRDialog", {
                                title: 'Success',
                                type: 'Message',
                                state: 'Success',
                                content: new sap.m.Text({
                                    text: `ASN  ${gateEntryNo} generated successfully`
                                }),
                                beginButton: new Button({
                                    text: 'Download ASN',
                                    press: function () {
                                        that.onViewQR(qrData); //call function to download QR code
                                        dialog.close();
                                    }
                                }),
                                afterClose: function () {
                                    dialog.destroy();
                                }
                            });
                            dialog.open();

                            dialog.attachBrowserEvent("keydown", function (oEvent) {
                                if (oEvent.key === "Escape") {
                                    oEvent.preventDefault();
                                    that.onViewQR(qrDataToPrintQRCode);
                                    dialog.close();

                                }
                            });

                        },
                        error: function (e) {
                            that.getView().setBusy(false);
                            if (e.responseText && (e.statusCode === 400 || e.statusCode === "400")) {
                                var err = JSON.parse(e.responseText);
                                var msg = err.error.message.value;
                            } else if (e.responseText && (e.statusCode === 500 || e.statusCode === "500")) {
                                var parser = new DOMParser();
                                var xmlDoc = parser.parseFromString(e.responseText, "text/xml");
                                var msg = xmlDoc.documentElement.childNodes[1].innerHTML;
                            } else {
                                var msg = e.message;
                            }
                            var bCompact = !!that.getView().$().closest(".sapUiSizeCompact").length;
                            MessageBox.error(
                                msg, {
                                styleClass: bCompact ? "sapUiSizeCompact" : ""
                            }
                            );
                        }
                    });
                }
            })
        },

        // onViewQR: function (qrData) {
        //     let that = this;
        //     let sQRCodeNumber = qrData.AsnNo;
        //     //let oQRCodeBox = new sap.m.VBox({});
        //     let oQRCodeBox = this.getView().byId("idVBox_QRCode");
        //     oQRCodeBox.setVisible(true);
        //     const oHtmlComp = new sap.ui.core.HTML({
        //         content: '<canvas id="qrCanvas" width="200" height="200" style="display:none;"></canvas>'
        //     });
        //     oQRCodeBox.addItem(oHtmlComp);

        //     setTimeout(function () {
        //          // Data to encode in QR Code
        //         // Generate QR Code using qrcode.js
        //         QRCode.toCanvas(document.getElementById('qrCanvas'),sQRCodeNumber, function (error) {
        //             if (error) {
        //                 sap.m.MessageToast.show("QR Code generation failed!");
        //                 return;
        //             }
        //             sap.m.MessageToast.show("QR Code generated!");
        //             // After generating the QR Code, create PDF
        //             that._generatePDF(qrData);
        //             oQRCodeBox.setVisible(false);
        //             that.clearUIFields();

        //         }.bind(this));
        //     }, 200);
        // },
        onViewQR: function (qrData) {
            let that = this;
            let sQRCodeNumber = qrData.AsnNo;

            // create hidden canvas dynamically
            let canvas = document.createElement("canvas");
            canvas.id = "qrCanvas";
            canvas.width = 200;
            canvas.height = 200;
            canvas.style.display = "none";
            document.body.appendChild(canvas);

            // QRCode.toCanvas(canvas, sQRCodeNumber, function (error) {
            //     if (error) {
            //         sap.m.MessageToast.show("QR Code generation failed!");
            //         return;
            //     }
            //     sap.m.MessageToast.show("QR Code generated!");
            //     that._generatePDF(qrData);
            //     that.clearUIFields();
            // });

            setTimeout(function () {
                try {
                    let sBarcodeData = qrData.AsnNo; // The value to encode in the barcode
                    // Generate barcode using JsBarcode
                    JsBarcode(canvas, sBarcodeData, {
                        format: "CODE128",   // Common & widely supported format
                        displayValue: false,  // Show the text below the barcode
                        fontSize: 14,
                        lineColor: "#000",
                        width: 2,
                        height: 50,
                        margin: 10
                    });

                    sap.m.MessageToast.show("Barcode generated!");

                    // After generating the barcode, create PDF
                    that._generatePDF(qrData);
                    that.clearUIFields();
                    // oQRCodeBox.setVisible(false);

                } catch (error) {
                    console.error(error);
                    sap.m.MessageToast.show("Barcode generation failed!");
                }
            }, 200);
        },
        _generatePDF: function (qrData) {
            var jsPDF = window.jspdf.jsPDF;
            //var doc = new jsPDF();
            var doc = new jsPDF('l', 'mm', [50, 25]);
            const supplierName = this.getOwnerComponent().getModel("RoutePoData").getProperty("/PoHeader/SupplierName");

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
            // Get the canvas element for the QR code
            var canvas = document.getElementById('qrCanvas');
            var imgData = canvas.toDataURL('image/png');

            // Add the QR code image to the PDF
            doc.addImage(imgData, 'PNG', 15, 1, 20, 10); // Adjust size and position as necessary
            doc.text(2, 12, `ASN Number: ${qrData.AsnNo}`);
            doc.text(2, 15, `Invoice Number: ${qrData.InvoiceNo}`);
            doc.text(2, 18, `Invoice Date: ${formattedInvDate}`);
            // doc.text(2, 17, `Supplier: ${supplierName} ( ${qrData.Vendor} )`);
            let vendorText = `Supplier: ${supplierName} ( ${qrData.Vendor} )`;
            let wrappedVendor = doc.splitTextToSize(vendorText, 43);
            doc.text(wrappedVendor, 2, 21, { maxWidth: 43, lineHeightFactor: 1.2 });
            // Save the PDF to a file
            doc.save(`ASN_${qrData.AsnNo}.pdf`);
        },

        clearUIFields: function () {
            let oView = this.getView();
            //oView.byId("idDocInvNo").setValue();
            // oView.byId("idDropdownPlant").setSelectedKey();
            // oView.byId("idDropdownPlant").setValue();
            oView.byId("idRAPO_Date").setValue();
            oView.byId("idRAPO_Time").setValue();
            oView.byId("idDocInvNo").setValue();

            oView.byId("idRAPO_InvDate").setValue();
            oView.byId("idRAPO_LR_Date").setValue();
            oView.byId("idRAPO_EWAY_Date").setValue();
            oView.byId("idRAPO_LR_No").setValue();
            // oView.byId("idRAPO_PO_Order").setValue();
            oView.byId("idRAPO_EwayNo").setValue();
            oView.byId("idRAPO_Amount").setValue();
            oView.byId("idRAPO_VehicalNo").setValue();
            oView.byId("idRAPO_Trasporter").setValue();
            let tModel = new sap.ui.model.json.JSONModel([]);
            oView.byId("idTable_RAPO").setModel(tModel);
            //oView.byId("idPanelChallan").setVisible(false);
            this.onNavFirstPage();
        },


        /** 🔹 Selection change (enable/disable download button) */
        onSelectionChange: function (oEvent) {
            const oTable = this.byId("table-uploadSet");
            const aSelected = oTable.getSelectedItems();
            this.byId("downloadSelectedButton").setEnabled(aSelected.length > 0);
        },

        /** 🔹 File preview */
        openPreview: function (oEvent) {
            const sFileName = oEvent.getSource().getText();
            MessageToast.show("Preview clicked for " + sFileName);
            // Optional: Implement inline preview via iframe/pdf viewer
        },

        /** 🔹 Formatter - file size */
        formatSize: function (iSize) {
            if (!iSize) return "0 KB";
            let sUnit = "Bytes";
            let iCalc = iSize;

            if (iSize > 1024) {
                iCalc = (iSize / 1024).toFixed(1);
                sUnit = "KB";
            }
            if (iSize > 1024 * 1024) {
                iCalc = (iSize / (1024 * 1024)).toFixed(1);
                sUnit = "MB";
            }
            return iCalc + " " + sUnit;
        },

        /** 🔹 Formatter - icon based on MIME type */
        getIconSrc: function (sFileName) {
            if (sFileName) {
                const sExt = sFileName.split(".").pop().toLowerCase();
                if (sExt === "pdf") return "sap-icon://pdf-attachment";
                if (["png", "jpg", "jpeg"].includes(sExt)) return "sap-icon://attachment-photo";
                return "sap-icon://document";
            }
            return "sap-icon://document";
        },
        checkQuantityInputErrors: function () {
            let oTable = this.getView().byId("idTable_RAPO");
            let bHasError = false;

            // Loop through all visible items in the table
            oTable.getItems().forEach(function (oItem) {
                // Find the Input field inside each row
                let oInput = oItem.getCells().find(control => control.getId().includes("idInpRAPOItemQuantity"));

                if (oInput && oInput.getValueState() === "Error") {
                    bHasError = true;
                }
            });

            return bHasError;
        },
        // formatSize: function (bytes) {
        //     return (bytes / 1024).toFixed(1);
        // },

        refreshFiles: async function () {
            let url = this.baseObjectStoreUrl + "/listFiles";
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });
            const data = await res.json();
            this.getView().getModel("files").setData(data.value || []);
        },

        // onUpload: function () {
        //     const that = this;
        //     const fileInput = document.createElement("input");
        //     fileInput.type = "file";
        //     fileInput.onchange = async function (e) {
        //         const file = e.target.files[0];
        //         if (!file) return;

        //         const arrayBuffer = await file.arrayBuffer();
        //         const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

        //         const res = await fetch(that.baseObjectStoreUrl + "/uploadFile", {
        //             method: "POST",
        //             headers: { "Content-Type": "application/json" },
        //             body: JSON.stringify({ objectName: file.name, content: base64 })
        //         });

        //         const result = await res.json();
        //         MessageToast.show(result.value || "Uploaded");
        //         that.refreshFiles();
        //     };
        //     fileInput.click();
        // },

        onUpload: function () {
            const that = this;
            const fileInput = document.createElement("input");
            fileInput.type = "file";
            fileInput.multiple = true; // allow multiple
            fileInput.onchange = async function (e) {
                const files = Array.from(e.target.files);
                if (!files.length) return;

                const aPending = that.getView().getModel("pendingFiles").getData();
                // Validation: max 5 files total
                if (aPending.length + files.length > 5) {
                    MessageToast.show("You can only attach up to 5 files.");
                    return;
                }

                files.forEach(file => {
                    aPending.push({
                        objectName: file.name,
                        size: file.size,
                        lastModified: file.lastModified,
                        file: file // keep raw file for later upload
                    });
                });

                that.getView().getModel("pendingFiles").setData(aPending);
            };
            fileInput.click();
        },

        onDownload: async function () {
            const table = this.byId("fileTable");
            const selected = table.getSelectedItem();
            if (!selected) return;

            const objectName = selected.getBindingContext("files").getObject().objectName;
            const res = await fetch(this.baseObjectStoreUrl + "/downloadFile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ objectName })
            });
            const data = await res.json();

            const byteCharacters = atob(data.content);
            const byteNumbers = Array.from(byteCharacters).map(c => c.charCodeAt(0));
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray]);
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = data.objectName;
            a.click();
            URL.revokeObjectURL(url);
        },

        onDelete: async function () {
            const table = this.byId("fileTable");
            const selected = table.getSelectedItem();
            if (!selected) return;

            const objectName = selected.getBindingContext("files").getObject().objectName;
            const res = await fetch(this.baseObjectStoreUrl + "/deleteFile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ objectName })
            });
            const result = await res.json();

            MessageToast.show(result.value || "Deleted");
            this.refreshFiles();
        },
        onFileSelect: function (oEvent) {
            const oTable = oEvent.getSource();
            const aSelectedContexts = oTable.getSelectedContexts("files"); // or your model name

            const bHasSelection = aSelectedContexts.length > 0;

            // Update RoutePoData>/attachbtn
            this.getView().getModel("RoutePoData").setProperty("/attachbtn", bHasSelection);
        },
        onSaveFiles: async function (asn) {
            const that = this;
            const pending = this.getView().getModel("pendingFiles").getData();

            for (let fileEntry of pending) {
                const file = fileEntry.file;
                const arrayBuffer = await file.arrayBuffer();
                const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
                let fileName = `${asn}/${file.name}`;
                await fetch(this.baseObjectStoreUrl + "/uploadFile", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ objectName: fileName, content: base64 })
                });
            }

            MessageToast.show("Files uploaded");

            // clear pending files
            this.getView().getModel("pendingFiles").setData([]);

            // refresh backend files
            // this.refreshFiles();
        },
        onRemovePendingFile: function (oEvent) {
            const oItem = oEvent.getSource().getParent(); // ColumnListItem
            const oCtx = oItem.getBindingContext("pendingFiles");
            const oData = this.getView().getModel("pendingFiles").getData();

            const index = oData.indexOf(oCtx.getObject());
            if (index > -1) {
                oData.splice(index, 1);
            }
            this.getView().getModel("pendingFiles").setData(oData);
        }




    });
});