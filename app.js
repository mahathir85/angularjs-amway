var app = angular.module("myApp", []);
var scopetest;

app.directive('amwayCart', function() {
    return {
      templateUrl: 'views/cart.html'
    };
});

app.directive('amwayDeals', function() {
    return {
      templateUrl: 'views/deals.html'
    };
});

app.directive('amwayDealform', function() {
    return {
      templateUrl: 'views/deal_form.html'
    };
});

app.directive('stringToNumber', function() {
    return {
      require: 'ngModel',
      link: function(scope, element, attrs, ngModel) {
        ngModel.$parsers.push(function(value) {
          return '' + value;
        });
        ngModel.$formatters.push(function(value) {
          return parseFloat(value);
        });
      }
    };
  });

app.filter('filterItemDeals',
function () {
    return function (items,scope) {
        var filtered = [];
        //console.log(scope);
        angular.forEach(items, function (item) {
            //if (item.BranchId < 6) {
            /*
            let includeItem = true;
            if(item.id == scope.form.itemId && item.levelId == $scope.form.levelId){
                includeItem = false;
            }
            if(includeItem){
                filtered.push(item);
            }
            */
            let includeItem = true;
            if(scope.form){
                console.log(scope.form.levelId);
                let temp = scope.rules.data.filter(function(itemRule){
                    if(itemRule.itemId == item.id && itemRule.levelId == scope.form.levelId) 
                        includeItem = false;
                });
            }
            

            if(includeItem)
                filtered.push(item);
        });
        return filtered;        
    }
});

app.controller("myCtrl", function($scope,$http) {
    scopetest = $scope;
    $scope.levelRecipient = [
        {"text": "Diamond", "id": "1"},
        {"text": "Platinum", "id": "2"},
        {"text": "Associate", "id": "3"}
    ];
	
	$scope.loadRules = function(){
        $http.get('rules.json').then(function (data){
            $scope.rules = data;
            window.localStorage['amway_deals'] = angular.toJson($scope.rules);
        });
    }

    $http.get('data.json').then(function (data){
		$scope.data = data;
    });

    if(!window.localStorage['amway_deals']){
        $scope.loadRules();
    }
    else{
        $scope.rules = angular.fromJson(window.localStorage['amway_deals']);
    }
    
    

    $scope.calculateItem = function(d){
        let itemOriginal = $scope.data.data.find( ({ id }) => id === d.id );
        let temp = $scope.rules.data.filter(function(item){
            if(item.itemId == d.id && item.levelId == $scope.level) 
                return true
        });
        let total = 0;
        let discount = true;

        if(temp.length > 0){
            if(temp[0].min == 0){
                total = temp[0].value * d.quantity;
                discount = false;
            }
            else if(d.quantity >= temp[0].min){
                if(temp[0].deal == 0){
                    total = temp[0].value * d.quantity;
                    discount = false;
                }
                else{
                    let balance = d.quantity % temp[0].min;    

                    if(balance == 0){                    
                        total = (Math.ceil(d.quantity/temp[0].min) * temp[0].deal) * itemOriginal.value; 
                        discount = false;
                    }
                    else{                        
                        total = (Math.floor(d.quantity/temp[0].deal) * temp[0].deal) * itemOriginal.value;                        
                        total = total + (itemOriginal.value * balance);
                        discount = false;    
                    }
                }
            }
            else{
                discount = true;
            }
        }

        if(discount){                        
            switch($scope.level){
                //Diamond
                case "1":
                    total = (itemOriginal.value - (itemOriginal.value * .20)) * d.quantity;
                    break;
                //Platinum
                case "2":
                    total = (itemOriginal.value - (itemOriginal.value * .15)) * d.quantity;
                    break;
                //Associate
                case "3":
                    total = (itemOriginal.value - (itemOriginal.value * .05)) * d.quantity;
                    break;
            }                     
        }

        return total;
    }

    $scope.calculate = function(){
        var checkoutItems = [];
        $scope.checkoutItems = [];
        $scope.total = 0;
        angular.forEach($scope.data.data, function(d) {
            if(d.quantity > 0){
                for(var x=0; x<d.quantity; x++){
                    $scope.checkoutItems.push(d.name);                    
                }
                $scope.total = $scope.total + $scope.calculateItem(d);
            }                
          }, checkoutItems);
        $scope.total = $scope.total.toFixed(2);
        $scope.checkoutItems = $scope.checkoutItems.join(", ");        
    }

    $scope.initAddDeal = function(){
        $scope.view = "form";
        if($scope.form)
            $scope.form = {"dealId":0,"levelId":$scope.form.levelId,"itemId":0,"name":"","min":0,"value":0.00,"deal":0,"dealType":false};           
        else
            $scope.form = {"dealId":0,"levelId":"1","itemId":0,"name":"","min":0,"value":0.00,"deal":0,"dealType":false};   

        $scope.initItemDeal();             
    }

    $scope.initItemDeal = function(){
        var selectedItems = [];
        angular.forEach($scope.data.data, function(d) {
            let temp = $scope.rules.data.filter(function(item){
                if(item.itemId == d.id && item.levelId == $scope.form.levelId) 
                    return true
            });              
            if(temp.length == 0){
                this.push(d);
            }
          }, selectedItems);

        $scope.selectedItems = selectedItems;        
    }

    $scope.cancel = function(){
        $scope.view = "list";        
    }

    $scope.updateItem = function(d){
        let selectedItem = $scope.data.data.find( ({ id }) => id === $scope.form.itemId );
        if(selectedItem)
            $scope.form.name = selectedItem.name;
    }

    $scope.updatePrice = function(){
        if($scope.form.deal > 0){
            let itemPrice = $scope.data.data.find( ({ id }) => id === $scope.form.itemId ).value;
            $scope.form.value = ($scope.form.deal * itemPrice) / $scope.form.min;
        }
    }

    $scope.removeDeal = function(d){
        let temp = $scope.rules.data.filter(function(item){
            if(item.dealId != d.dealId) 
                return true
        });

        $scope.rules.data = temp;
        window.localStorage['amway_deals'] = angular.toJson($scope.rules);
    }

    $scope.save = function(){
        $scope.form.dealId = Math.max.apply(Math, $scope.rules.data.map(function(o) { return o.dealId; })) + 1;          
        $scope.rules.data.push($scope.form);
        
        $scope.levelRules = $scope.form.levelId;
        $scope.view = "list";
        window.localStorage['amway_deals'] = angular.toJson($scope.rules);
    }

    $scope.filterMe = function(){
        console.log('test');
    }
    
    $scope.levelRules = "1";
    $scope.level = "1";
    $scope.view = "list";    
});