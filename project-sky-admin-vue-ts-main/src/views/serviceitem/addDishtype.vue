<template>
  <div :key="vueRest"
       class="addBrand-container">
    <div :key="restKey"
         class="container">
      <el-form ref="ruleForm"
               :model="ruleForm"
               :rules="rules"
               :inline="true"
               label-width="180px"
               class="demo-ruleForm">
        <div>
          <el-form-item label="服务项名称:"
                        prop="name">
            <el-input v-model="ruleForm.name"
                      placeholder="请填写服务项名称"
                      maxlength="20" />
          </el-form-item>
          <el-form-item label="服务项分类:"
                        prop="categoryId">
            <el-select v-model="ruleForm.categoryId"
                       placeholder="请选择服务项分类">
              <el-option v-for="(item, index) in serviceItemList"
                         :key="index"
                         :label="item.name"
                         :value="item.id" />
            </el-select>
          </el-form-item>
        </div>
        <div>
          <el-form-item label="服务项价格:"
                        prop="price">
            <el-input v-model="ruleForm.price"
                      placeholder="请设置服务项价格" />
          </el-form-item>
        </div>
        <el-form-item label="特性配置:">
          <el-form-item>
            <div class="flavorBox">
              <span v-if="serviceItemFeatures.length == 0"
                    class="addBut"
                    @click="addFeature">
                + 添加特性</span>
              <div v-if="serviceItemFeatures.length != 0"
                   class="flavor">
                <div class="title">
                  <span>特性名</span>
                </div>
                <div class="cont">
                  <div v-for="(item, index) in serviceItemFeatures"
                       :key="index"
                       class="items">
                    <div class="itTit">
                      <SelectInput :dish-flavors-data="leftServiceItemFeatures"
                                   :index="index"
                                   :value="item.name"
                                   @select="selectHandle" />
                    </div>
                    <div class="labItems"
                         style="display: flex">
                      <span v-for="(it, ind) in item.value"
                            :key="ind">{{ it }}
                        <i @click="delFeatureLabel(index, ind)">X</i></span>
                      <div class="inputBox"
                           :style="inputStyle" />
                    </div>
                    <span class="delFlavor delBut non"
                          @click="delFeature(item.name)">删除</span>
                  </div>
                </div>
                <div v-if="
                       !!this.leftServiceItemFeatures.length &&
                         this.serviceItemFeatures.length < this.serviceItemFeaturesData.length
                     "
                     class="addBut"
                     @click="addFeature">
                  添加特性
                </div>
              </div>
            </div>
          </el-form-item>
        </el-form-item>
        <div>
          <el-form-item label="服务项图片:"
                        prop="image">
            <image-upload :prop-image-url="imageUrl"
                          @imageChange="imageChange">
              图片大小不超过2M<br>仅能上传 PNG JPEG JPG类型图片<br>建议上传200*200或300*300尺寸的图片
            </image-upload>
          </el-form-item>
        </div>
        <div class="address">
          <el-form-item label="服务项描述:"
                        prop="region">
            <el-input v-model="ruleForm.description"
                      type="textarea"
                      :rows="3"
                      maxlength="200"
                      placeholder="服务项描述，最长200字" />
          </el-form-item>
        </div>
        <div class="subBox address">
          <el-button @click="() => $router.back()">
            取消
          </el-button>
          <el-button type="primary"
                     :class="{ continue: actionType === 'add' }"
                     @click="submitForm('ruleForm')">
            保存
          </el-button>
          <el-button v-if="actionType == 'add'"
                     type="primary"
                     @click="submitForm('ruleForm', 'goAnd')">
            保存并继续添加
          </el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator'
import HeadLable from '@/components/HeadLable/index.vue'
import SelectInput from './components/SelectInput.vue'
import ImageUpload from '@/components/ImgUpload/index.vue'
import {
  queryServiceItemById,
  addServiceItem,
  editServiceItem,
  getCategoryList,
  commonDownload
} from '@/api/serviceitem'
import { baseUrl } from '@/config.json'
import { getToken } from '@/utils/cookies'
@Component({
  name: 'addShop',
  components: {
    HeadLable,
    SelectInput,
    ImageUpload
  }
})
export default class extends Vue {
  private restKey: number = 0
  private textarea: string = ''
  private value: string = ''
  private imageUrl: string = ''
  private actionType: string = ''
  private serviceItemList: string[] = []
  private serviceItemFeaturesData: any[] = []
  private serviceItemFeatures: any[] = []
  private leftServiceItemFeatures: any[] = []
  private vueRest = '1'
  private index = 0
  private inputStyle = { flex: 1 }
  private headers = {
    token: getToken()
  }
  private ruleForm = {
    name: '',
    id: '',
    price: '',
    code: '',
    image: '',
    description: '',
    serviceItemFeatures: [],
    status: true,
    categoryId: ''
  }

  get rules() {
    return {
      name: [
        {
          required: true,
          validator: (rule: any, value: string, callback: Function) => {
            if (!value) {
              callback(new Error('请输入服务项名称'))
            } else {
              const reg = /^([A-Za-z0-9\u4e00-\u9fa5]){2,20}$/
              if (!reg.test(value)) {
                callback(new Error('服务项名称输入不符，请输入2-20个字符'))
              } else {
                callback()
              }
            }
          },
          trigger: 'blur'
        }
      ],
      categoryId: [
        { required: true, message: '请选择服务项分类', trigger: 'change' }
      ],
      image: {
        required: true,
        message: '服务项图片不能为空'
      },
      price: [
        {
          required: true,
          validator: (rules: any, value: string, callback: Function) => {
            const reg = /^([1-9]\d{0,5}|0)(\.\d{1,2})?$/
            if (!reg.test(value) || Number(value) < 0) {
              callback(
                new Error(
                  '服务项价格格式有误，请输入大于等于零且最多保留两位小数的金额'
                )
              )
            } else {
              callback()
            }
          },
          trigger: 'blur'
        }
      ],
      code: [{ required: true, message: '请填写商品码', trigger: 'blur' }]
    }
  }

  created() {
    this.getServiceItemList()
    this.getFeatureListHand()
    this.actionType = this.$route.query.id ? 'edit' : 'add'
    if (this.$route.query.id) {
      this.init()
    }
  }

  mounted() {}
  @Watch('serviceItemFeatures')
  changeServiceItemFeatures() {
    this.getLeftServiceItemFeatures()
  }

  getLeftServiceItemFeatures() {
    let arr = []
    this.serviceItemFeaturesData.map(item => {
      if (
        this.serviceItemFeatures.findIndex(item1 => item.name === item1.name) === -1
      ) {
        arr.push(item)
      }
    })
    this.leftServiceItemFeatures = arr
  }

  private selectHandle(val: any, key: any, ind: any) {
    const arrDate = [...this.serviceItemFeatures]
    const index = this.serviceItemFeaturesData.findIndex(item => item.name === val)
    arrDate[key] = JSON.parse(JSON.stringify(this.serviceItemFeaturesData[index]))
    this.serviceItemFeatures = arrDate
  }

  private async init() {
    queryServiceItemById(this.$route.query.id).then(res => {
      if (res && res.data && res.data.code === 1) {
        this.ruleForm = { ...res.data.data }
        this.ruleForm.price = String(res.data.data.price)
        this.ruleForm.status = res.data.data.status == '1'
        this.serviceItemFeatures =
          res.data.data.features &&
          res.data.data.features.map(obj => ({
            ...obj,
            value: JSON.parse(obj.value)
          }))
        let arr = []
        this.getLeftServiceItemFeatures()
        this.imageUrl = res.data.data.image
      } else {
        this.$message.error(res.data.msg)
      }
    })
  }

  private addFeature() {
    this.serviceItemFeatures.push({ name: '', value: [] })
  }

  private delFeature(name: string) {
    let ind = this.serviceItemFeatures.findIndex(item => item.name === name)
    this.serviceItemFeatures.splice(ind, 1)
  }

  private delFeatureLabel(index: number, ind: number) {
    this.serviceItemFeatures[index].value.splice(ind, 1)
  }

  private featurePosition(index: number) {
    this.index = index
  }

  private keyDownHandle(val: any) {
    if (event) {
      event.cancelBubble = true
      event.preventDefault()
      event.stopPropagation()
    }

    if (val.target.innerText.trim() != '') {
      this.serviceItemFeatures[this.index].featureData.push(val.target.innerText)
      val.target.innerText = ''
    }
  }

  private getServiceItemList() {
    getCategoryList({ type: 1 }).then(res => {
      if (res.data.code === 1) {
        this.serviceItemList = res && res.data && res.data.data
      } else {
        this.$message.error(res.data.msg)
      }
    })
  }

  private getFeatureListHand() {
    this.serviceItemFeaturesData = [
      { name: '服务等级', value: ['基础', '标准', '高级', '豪华', '至尊'] },
      { name: '服务方式', value: ['上门服务', '到店服务', '远程服务', '预约服务', '紧急服务'] },
      { name: '附加需求', value: ['数据备份', '设备借用', '会议室布置', '物料打印', '其他'] },
      { name: '紧急程度', value: ['一般', '紧急', '非常紧急', '特急'] }
    ]
  }

  private submitForm(formName: any, st: any) {
    ;(this.$refs[formName] as any).validate((valid: any) => {
      console.log(valid, 'valid')
      if (valid) {
        if (!this.ruleForm.image) return this.$message.error('服务项图片不能为空')
        let params: any = { ...this.ruleForm }
        params.status =
          this.actionType === 'add' ? 0 : this.ruleForm.status ? 1 : 0
        params.categoryId = this.ruleForm.categoryId
        params.features = this.serviceItemFeatures.map(obj => ({
          ...obj,
          value: JSON.stringify(obj.value)
        }))
        delete params.serviceItemFeatures
        if (this.actionType == 'add') {
          delete params.id
          addServiceItem(params)
            .then(res => {
              if (res.data.code === 1) {
                this.$message.success('服务项添加成功！')
                if (!st) {
                  this.$router.push({ path: '/service-item' })
                } else {
                  this.serviceItemFeatures = []
                  this.imageUrl = ''
                  this.ruleForm = {
                    name: '',
                    id: '',
                    price: '',
                    code: '',
                    image: '',
                    description: '',
                    serviceItemFeatures: [],
                    status: true,
                    categoryId: ''
                  }
                  this.restKey++
                }
              } else {
                this.$message.error(res.data.desc || res.data.msg)
              }
            })
            .catch(err => {
              this.$message.error('请求出错了：' + err.message)
            })
        } else {
          delete params.createTime
          delete params.updateTime
          editServiceItem(params)
            .then(res => {
              if (res && res.data && res.data.code === 1) {
                this.$router.push({ path: '/service-item' })
                this.$message.success('服务项修改成功！')
              } else {
                this.$message.error(res.data.desc || res.data.msg)
              }
            })
            .catch(err => {
              this.$message.error('请求出错了：' + err.message)
            })
        }
      } else {
        return false
      }
    })
  }

  imageChange(value: any) {
    this.ruleForm.image = value
  }
}
</script>
<style lang="scss" scoped>
.addBrand-container {
  .el-form--inline .el-form-item__content {
    width: 293px;
  }

  .el-input {
    width: 350px;
  }

  .address {
    .el-form-item__content {
      width: 777px !important;
    }
  }
}
</style>
<style lang="scss" scoped>
.addBrand {
  &-container {
    margin: 30px;

    .container {
      position: relative;
      z-index: 1;
      background: #fff;
      padding: 30px;
      border-radius: 4px;
      min-height: 500px;

      .subBox {
        padding-top: 30px;
        text-align: center;
        border-top: solid 1px $gray-5;
      }
      .upload-item {
        .el-form-item__error {
          top: 90%;
        }
      }
    }
  }
}

.flavorBox {
  width: 777px;

  .addBut {
    background: #ffc200;
    display: inline-block;
    padding: 0px 20px;
    border-radius: 3px;
    line-height: 40px;
    cursor: pointer;
    border-radius: 4px;
    color: #333333;
    font-weight: 500;
  }

  .flavor {
    border: solid 1px #dfe2e8;
    border-radius: 3px;
    padding: 15px;
    background: #fafafb;

    .title {
      color: #606168;
      .des-box {
        padding-left: 44px;
      }
    }

    .cont {
      .items {
        display: flex;
        margin: 10px 0;

        .itTit {
          width: 150px;
          margin-right: 15px;

          input {
            width: 100%;
          }
        }

        .labItems {
          flex: 1;
          display: flex;
          flex-wrap: wrap;
          border-radius: 3px;
          min-height: 39px;
          border: solid 1px #d8dde3;
          background: #fff;
          padding: 0 5px;

          span {
            display: inline-block;
            color: #ffc200;
            margin: 5px;
            line-height: 26px;
            padding: 0 10px;
            background: #fffbf0;
            border: 1px solid #fbe396;
            border-radius: 4px;
            font-size: 12px;

            i {
              cursor: pointer;
              font-style: normal;
            }
          }

          .inputBox {
            display: inline-block;
            width: 100%;
            height: 36px;
            line-height: 36px;
            overflow: hidden;
          }
        }

        .delFlavor {
          display: inline-block;
          padding: 0 10px;
          color: #f19c59;
          cursor: pointer;
        }
      }
    }
  }
}
</style>
