//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2023  Interneuron Holdings Ltd

//This program is free software: you can redistribute it and/or modify
//it under the terms of the GNU General Public License as published by
//the Free Software Foundation, either version 3 of the License, or
//(at your option) any later version.

//This program is distributed in the hope that it will be useful,
//but WITHOUT ANY WARRANTY; without even the implied warranty of
//MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

//See the
//GNU General Public License for more details.

//You should have received a copy of the GNU General Public License
//along with this program.If not, see<http://www.gnu.org/licenses/>.
//END LICENSE BLOCK 

export class FilterCriteria {
    public searchTerm: string;
    public showOnlyArchived: boolean;
    public recStatusCds?: any;
    public formularyStatusCd?: any;
    public showOnlyDuplicate?: any;
    public includeDeleted: boolean;
}

export class product {
    public parents?: any;
    public children: product[];
    public rowId?: any;
    public createdtimestamp?: any;
    public createddate?: any;
    public createdby?: any;
    public formularyId: string;
    public versionId: number;
    public code: string;
    public name: string;
    public productType: string;
    public logicalLevel: number;
    public parentCode?: any;
    public parentName?: any;
    public parentProductType?: any;
    public parentProductLogicalLevel?: any;
    public isDuplicate: boolean;
    public isLatest?: any;
    public formularyVersionId: string;
    public recStatusCode: string;
    public recSource?: any;
    public prescribable?:boolean;

    public deserialise(c: any) {
        const d = this;
        d.children = [];
        d.children = c.children;
        d.rowId = c.rowId;
        d.formularyId = c.formularyId;
        d.versionId = c.versionId;
        d.code = c.code;
        d.name = c.name;
        d.productType = c.productType;
        d.logicalLevel = c.logicalLevel;
        d.parentCode = c.parentCode;
        d.parentName = c.parentName;
        d.parentProductType = c.parentProductType;
        d.parentProductLogicalLevel = c.parentProductLogicalLevel;
        d.formularyVersionId = c.formularyVersionId;
        d.prescribable = c.prescribable;
    }
}

export class products {
    public filterCriteria: FilterCriteria;
    public data: product[];

    public deserialise(json: any) {
        const source = json;

        //level 1
        this.filterCriteria = source["filterCriteria"];
        this.data = [];
        for (const s1 of source.data) {
            let l1 = new product();
            l1.deserialise(s1);

            //level 2
            for (const s2 in s1.children) {
                let l2 = new product();
                l2.deserialise(s1.children[s2]);
                //level 3
                for (const s3 in l2.children) {
                    let l3 = new product();
                    l3.deserialise(l2.children[s3]);
                   // l2.children.push(l3);
                }
                l1.children.push(l2);

            }
            this.data.push(l1);
        }
    }
}

