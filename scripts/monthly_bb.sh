#!/bin/bash
# usage: monthly_bb.sh <daily.csv>  -> monthly OHLC + BB(20,2,0) + SMA9 on stdout
# BB uses population stdev (TradingView standard). Last month may be partial.
awk -F, 'NR>1{
  m=substr($1,1,7)
  if(m!=cur){ if(cur!=""){n++;M[n]=cur;O[n]=o;H[n]=h;L[n]=l;C[n]=c}
    cur=m;o=$2;h=$3;l=$4 }
  if($3>h)h=$3; if($4<l)l=$4; c=$5; lastd=$1
}
END{
  n++;M[n]=cur;O[n]=o;H[n]=h;L[n]=l;C[n]=c
  print "month,open,high,low,close,sma20,upper,lower,sma9,partial"
  for(i=1;i<=n;i++){
    s20="";up="";lo="";s9=""
    if(i>=20){s=0;for(j=i-19;j<=i;j++)s+=C[j];mu=s/20;v=0;for(j=i-19;j<=i;j++)v+=(C[j]-mu)^2;sd=sqrt(v/20);s20=sprintf("%.2f",mu);up=sprintf("%.2f",mu+2*sd);lo=sprintf("%.2f",mu-2*sd)}
    if(i>=9){s=0;for(j=i-8;j<=i;j++)s+=C[j];s9=sprintf("%.2f",s/9)}
    printf "%s,%s,%s,%s,%s,%s,%s,%s,%s,%s\n",M[i],O[i],H[i],L[i],C[i],s20,up,lo,s9,(i==n?"1":"0")
  }
}' "$1"
